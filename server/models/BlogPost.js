const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  excerpt: { type: String, required: true, maxlength: 300 },
  content: { type: String, required: true },
  author: { type: String, required: true, default: 'Equipo Tribus' },
  category: {
    type: String,
    required: true,
    enum: ['Networking', 'Ahorro', 'Tecnología', 'Productividad', 'Emprendimiento', 'Coworking', 'Otro'],
    default: 'Coworking'
  },
  image: { type: String, default: '📝' },
  keywords: [{ type: String, trim: true }],
  readTime: { type: String, default: '5 min' },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
  views: { type: Number, default: 0 },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true }
  },
  lastModifiedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    modifiedAt: Date
  }
}, { timestamps: true });

blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ published: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1 });
blogPostSchema.index({ keywords: 1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
