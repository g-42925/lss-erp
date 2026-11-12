import mongoose, { Schema } from "mongoose"

const PredefinedUnitSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    symbol: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            "weight",
            "volume",
            "length",
            "area",
            "time",
            "quantity"
        ]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    factorToBase: {
        type: Number,
        required: true
    }
},

    {
        timestamps: true
    }
)

PredefinedUnitSchema.index({ category: 1, name: 1 })

export default mongoose.models.PredefinedUnit || mongoose.model("PredefinedUnit", PredefinedUnitSchema)