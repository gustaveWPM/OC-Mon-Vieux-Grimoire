import mongoose, { Document, Schema } from 'mongoose';
import { validator as YearValidator, message as YearValidatorMsg } from '../lib/YearValidator';

const RatingValidator = (r: number) => r >= 0 && r <= 5;
const ratingValidatorMsg = 'La note doit être comprise entre 0 et 5';

interface IRating extends Document {
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
  image?: string;
  imageUrl: string;
}

const ratingSchema: Schema<IRating> = new mongoose.Schema({
  userId: { type: String, required: true },
  grade: {
    type: Number,
    required: true,
    validate: {
      validator: RatingValidator,
      message: ratingValidatorMsg
    }
  }
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
  averageRating: { type: Number, required: true, min: 0, max: 5 },
  image: { type: String },
  imageUrl: { type: String, required: true }
});

bookSchema.index({ averageRating: -1 });

export default mongoose.model<BookDocument>('Book', bookSchema);
