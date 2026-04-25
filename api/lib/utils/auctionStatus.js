const { RFQ_STATUS } = require('../constants/auctionConstants');

/**
 * Get the current status of an auction based on time
 * @param {Object} rfq - RFQ document
 * @param {Date} now - Current date/time (defaults to new Date())
 * @returns {string} - Auction status
 */
const getAuctionStatus = (rfq, now = new Date()) => {
  if (!rfq) return RFQ_STATUS.DRAFT;

  // If RFQ is in DRAFT, CANCELLED, or already has a terminal status, return as-is
  if ([RFQ_STATUS.DRAFT, RFQ_STATUS.CANCELLED].includes(rfq.status)) {
    return rfq.status;
  }

  const bidStartTime = new Date(rfq.bidStartTime);
  const currentCloseTime = new Date(rfq.currentCloseTime);
  const forcedCloseTime = rfq.forcedCloseTime ? new Date(rfq.forcedCloseTime) : null;

  // Before bid start time
  if (now < bidStartTime) {
    return RFQ_STATUS.UPCOMING;
  }

  // Active period (between bid start and current close time)
  if (now >= bidStartTime && now <= currentCloseTime) {
    return RFQ_STATUS.ACTIVE;
  }

  // After current close time but before forced close time
  if (now > currentCloseTime) {
    if (forcedCloseTime && now < forcedCloseTime) {
      return RFQ_STATUS.CLOSED;
    }
    // After forced close time or no forced close time set
    return RFQ_STATUS.FORCE_CLOSED;
  }

  // Default to current status if no time-based rule matches
  return rfq.status;
};

/**
 * Check if auction can accept new bids
 * @param {Object} rfq - RFQ document
 * @param {Date} now - Current date/time
 * @returns {boolean}
 */
const canAcceptBids = (rfq, now = new Date()) => {
  const status = getAuctionStatus(rfq, now);
  return status === RFQ_STATUS.ACTIVE;
};

/**
 * Check if auction is in extension window
 * @param {Object} rfq - RFQ document
 * @param {Date} now - Current date/time
 * @returns {boolean}
 */
const isInExtensionWindow = (rfq, now = new Date()) => {
  if (!rfq.auctionEnabled) return false;
  
  const currentCloseTime = new Date(rfq.currentCloseTime);
  const triggerWindowMinutes = rfq.triggerWindowMinutes || 10;
  const windowStart = new Date(currentCloseTime.getTime() - triggerWindowMinutes * 60000);
  
  return now >= windowStart && now <= currentCloseTime;
};

module.exports = {
  getAuctionStatus,
  canAcceptBids,
  isInExtensionWindow
};
