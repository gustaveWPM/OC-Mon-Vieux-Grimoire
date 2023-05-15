import mongoose, { Document, Schema } from 'mongoose';
import { validator as YearValidator, message as YearValidatorMsg } from '../lib/YearValidator';

export interface IRating extends Document {
  userId: string;
  grade: number;
}

export interface BookDocument extends Document {
  userId: string;
  title: string;
  author: string;
  year: string | number;
  genre: string;
  ratings: IRating[];
  averageRating: number;
  imageUrl: string;
}

const MIN_RATE = 0;
const MAX_RATE = 5;
const bookRateMongooseSpecs = { type: Number, required: true, min: MIN_RATE, max: MAX_RATE };

const ratingSchema: Schema<IRating> = new mongoose.Schema({
  userId: { type: String, required: true },
  grade: bookRateMongooseSpecs
});

const bookSchema: Schema<BookDocument> = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: YearValidator,
      message: YearValidatorMsg
    }
  },
  genre: { type: String, required: true },
  ratings: { type: [ratingSchema], required: true },
  averageRating: bookRateMongooseSpecs,
  imageUrl: { type: String, required: true }
});

bookSchema.index({ averageRating: -1 });

export default mongoose.model<BookDocument>('Book', bookSchema);
