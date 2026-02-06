import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  name: {type:String, required:true},
  code: {type:String, required:true},
  locationOf: {type:mongoose.Schema.Types.ObjectId, required:true},
});

// Cek apakah model sudah ada (Next.js hot reload bisa bikin error)
export default mongoose.models.Location || mongoose.model('Location', LocationSchema);                                                 