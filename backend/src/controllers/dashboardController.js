const RFQ = require('../models/RFQ');
const Bid = require('../models/Bid');
const User = require('../models/User');
const { RFQ_STATUS } = require('../constants/auctionConstants');
const { getAuctionStatus } = require('../utils/auctionStatus');

// Buyer Dashboard Stats
const getBuyerDashboard = async (req, res) => {
  try {
    const buyerId = req.user._id;

    console.log('[BUYER ANALYTICS] Fetching for buyer:', buyerId);

    // Get all RFQs for this buyer
    const rfqs = await RFQ.find({ createdBy: buyerId })
      .populate('winnerSupplier');

    console.log('[BUYER ANALYTICS] RFQs found:', rfqs.length);
    const rfqIds = rfqs.map(r => r._id);
    console.log('[BUYER ANALYTICS] RFQ IDs:', rfqIds);

    // Calculate dynamic status for each RFQ
    const rfqsWithStatus = rfqs.map(rfq => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      return rfqObj;
    });

    // Count by dynamic status
    const totalRFQs = rfqsWithStatus.length;
    const activeAuctions = rfqsWithStatus.filter(r => r.status === RFQ_STATUS.ACTIVE).length;
    const closedAuctions = rfqsWithStatus.filter(r => 
      r.status === RFQ_STATUS.CLOSED || r.status === RFQ_STATUS.FORCE_CLOSED
    ).length;
    const upcomingAuctions = rfqsWithStatus.filter(r => r.status === RFQ_STATUS.UPCOMING).length;

    // Get all bids for buyer's RFQs
    const allBids = await Bid.find({ rfqId: { $in: rfqIds } })
      .populate('rfqId', 'rfqName referenceId')
      .populate('supplierId', 'name companyName')
      .sort({ createdAt: -1 });

    console.log('[BUYER ANALYTICS] Total bids found:', allBids.length);

    // Calculate bid statistics
    const totalBids = allBids.length;
    const avgBidAmount = totalBids > 0 
      ? allBids.reduce((sum, bid) => sum + bid.totalAmount, 0) / totalBids 
      : 0;

    // Calculate L1 positions (count current L1 suppliers for each RFQ)
    let l1Count = 0;
    console.log('[BUYER ANALYTICS] Calculating L1 positions for', rfqIds.length, 'RFQs');
    
    for (const rfqId of rfqIds) {
      // Get the lowest bid for this RFQ
      const lowestBid = await Bid.findOne({ 
        rfqId,
        isRejected: false 
      }).sort({ totalAmount: 1 });
      
      if (lowestBid) {
        console.log('[BUYER ANALYTICS] RFQ', rfqId, 'has L1 bid:', lowestBid.totalAmount, 'by supplier:', lowestBid.supplierId);
        l1Count++;
      } else {
        console.log('[BUYER ANALYTICS] RFQ', rfqId, 'has no bids');
      }
    }

    console.log('[BUYER ANALYTICS] Stats - Total Bids:', totalBids, 'Avg:', avgBidAmount, 'L1 Count:', l1Count);

    // Calculate total savings (difference between estimated and actual)
    let totalSavings = 0;
    for (const rfq of rfqsWithStatus) {
      if (rfq.estimatedValue && rfq.winnerSupplier && 
          (rfq.status === RFQ_STATUS.CLOSED || rfq.status === RFQ_STATUS.FORCE_CLOSED)) {
        const lowestBid = await Bid.findOne({ 
          rfqId: rfq._id, 
          supplierId: rfq.winnerSupplier._id 
        }).sort({ totalAmount: 1 });
        if (lowestBid) {
          totalSavings += rfq.estimatedValue - lowestBid.totalAmount;
        }
      }
    }

    // Recent activity (with dynamic status)
    const recentRFQs = rfqsWithStatus
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Recent bids (last 10)
    const recentBids = allBids.slice(0, 10);

    console.log('[BUYER ANALYTICS] Recent bids count:', recentBids.length);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRFQs,
          activeAuctions,
          closedAuctions,
          upcomingAuctions,
          totalSavings,
          totalBids,
          l1Count,
          avgBidAmount
        },
        recentRFQs,
        recentBids
      }
    });
  } catch (error) {
    console.log('[BUYER ANALYTICS] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching buyer dashboard'
    });
  }
};

// Supplier Dashboard Stats
const getSupplierDashboard = async (req, res) => {
  try {
    const supplierId = req.user._id;

    console.log('[SUPPLIER ANALYTICS] Fetching for supplier:', supplierId);

    // Get all bids by this supplier
    const myBids = await Bid.find({ supplierId })
      .populate('rfqId', 'rfqName referenceId')
      .populate('supplierId', 'name companyName')
      .sort({ createdAt: -1 });

    console.log('[SUPPLIER ANALYTICS] Total bids found:', myBids.length);

    // Get distinct RFQs from supplier's bids
    const rfqIds = [...new Set(myBids.map(bid => bid.rfqId._id.toString()))];
    console.log('[SUPPLIER ANALYTICS] Distinct RFQs:', rfqIds.length);

    // Calculate statistics
    const totalBids = myBids.length;
    const totalRFQs = rfqIds.length;
    const avgBidAmount = totalBids > 0 
      ? myBids.reduce((sum, bid) => sum + bid.totalAmount, 0) / totalBids 
      : 0;

    // Calculate L1 positions (RFQs where this supplier is lowest bidder)
    let l1Count = 0;
    console.log('[SUPPLIER ANALYTICS] Calculating L1 positions for', rfqIds.length, 'RFQs');
    
    for (const rfqId of rfqIds) {
      const lowestBid = await Bid.findOne({ 
        rfqId,
        isRejected: false 
      }).sort({ totalAmount: 1 });
      
      if (lowestBid && lowestBid.supplierId.toString() === supplierId.toString()) {
        console.log('[SUPPLIER ANALYTICS] RFQ', rfqId, 'supplier is L1 with bid:', lowestBid.totalAmount);
        l1Count++;
      }
    }

    console.log('[SUPPLIER ANALYTICS] Stats - Total RFQs:', totalRFQs, 'Total Bids:', totalBids, 'Avg:', avgBidAmount, 'L1 Count:', l1Count);

    // Get available auctions (PUBLIC or invited)
    const availableRFQs = await RFQ.find({
      $or: [
        { visibility: 'PUBLIC' },
        { invitedSuppliers: supplierId }
      ]
    });

    const rfqsWithStatus = availableRFQs.map(rfq => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      return rfqObj;
    });

    const availableAuctions = rfqsWithStatus.filter(r => 
      r.status === RFQ_STATUS.UPCOMING || r.status === RFQ_STATUS.ACTIVE
    ).length;

    // Participated auctions = distinct RFQs where supplier has submitted bids
    const participatedAuctions = totalRFQs;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRFQs,
          totalBids,
          l1Count,
          avgBidAmount,
          availableAuctions,
          participatedAuctions
        },
        myBids: myBids.slice(0, 10)
      }
    });
  } catch (error) {
    console.log('[SUPPLIER ANALYTICS] Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching supplier dashboard'
    });
  }
};

// Admin Dashboard Stats
const getAdminDashboard = async (req, res) => {
  try {
    const totalRFQs = await RFQ.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalBids = await Bid.countDocuments();

    // Get all RFQs to calculate dynamic status
    const rfqs = await RFQ.find();
    const rfqsWithStatus = rfqs.map(rfq => {
      const rfqObj = rfq.toObject();
      rfqObj.status = getAuctionStatus(rfqObj);
      return rfqObj;
    });

    // Count active auctions by dynamic status
    const activeAuctions = rfqsWithStatus.filter(r => r.status === RFQ_STATUS.ACTIVE).length;

    // Group by dynamic status
    const rfqsByStatus = rfqsWithStatus.reduce((acc, rfq) => {
      acc[rfq.status] = (acc[rfq.status] || 0) + 1;
      return acc;
    }, {});

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalRFQs,
          activeAuctions,
          totalUsers,
          totalBids
        },
        rfqsByStatus,
        usersByRole
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching admin dashboard'
    });
  }
};

module.exports = {
  getBuyerDashboard,
  getSupplierDashboard,
  getAdminDashboard
};
