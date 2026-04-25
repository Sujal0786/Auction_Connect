const socketConfig = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join RFQ room for real-time updates
    socket.on('join_rfq', (rfqId) => {
      socket.join(`rfq_${rfqId}`);
      console.log(`User ${socket.id} joined RFQ room: ${rfqId}`);
    });

    // Leave RFQ room
    socket.on('leave_rfq', (rfqId) => {
      socket.leave(`rfq_${rfqId}`);
      console.log(`User ${socket.id} left RFQ room: ${rfqId}`);
    });

    // Join user's personal room for dashboard updates
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${socket.id} joined user room: ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

// Helper function to emit bid events
const emitBidEvent = (io, rfqId, eventType, data) => {
  io.to(`rfq_${rfqId}`).emit(eventType, data);
};

// Helper function to emit dashboard updates
const emitDashboardUpdate = (io, userId, data) => {
  io.to(`user_${userId}`).emit('dashboard_update', data);
};

module.exports = socketConfig;
module.exports.emitBidEvent = emitBidEvent;
module.exports.emitDashboardUpdate = emitDashboardUpdate;
