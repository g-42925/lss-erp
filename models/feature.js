import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  group: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  }
});

export default mongoose.models.Feature || mongoose.model('Feature', featureSchema)


