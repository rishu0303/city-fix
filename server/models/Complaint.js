import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String }, 
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['Roads', 'Electrical', 'Sanitation', 'Water', 'General', 'Pending_AI_Review'],
    default: 'Pending_AI_Review'
  },
  aiConfidenceScore: { type: Number, min: 0, max: 100 },
  imageUrl: { type: String, required: true }, 
  resolutionImageUrl: { type: String }, 
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    addressString: { type: String }
  },
  status: {
    type: String,
    enum: ['Submitted', 'In Review', 'Assigned', 'In Progress', 'Resolved', 'Reopened', 'Rejected'],
    default: 'Submitted'
  },
  priorityScore: { type: Number, default: 0 },
  severityRating: { type: Number, default: 1, min: 1, max: 5 },
  isEscalated: { type: Boolean, default: false },
  upvotes: { type: Number, default: 0 },
  pineconeVectorId: { type: String }, 

  timeline: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create a 2dsphere index for location-based feeds
complaintSchema.index({ location: '2dsphere' });

// FIX: Removed 'next' and 'next()' from the pre-save hook. 
// Modern Mongoose handles synchronous hooks automatically!
complaintSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

export default mongoose.model('Complaint', complaintSchema);