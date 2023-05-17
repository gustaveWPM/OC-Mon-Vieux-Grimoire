import mongoose, { Document, Schema } from 'mongoose';
import { validator as bookStringFieldValidator, message as bookStringFieldValidatorMsg } from '../lib/BookStringFieldValidator';
import { validator as yearValidator, message as yearValidatorMsg } from '../lib/YearValidator';

export interface IRating extends Document {
  userId: string;
  grade: number;
}

export interface BookDocument extends Document {
  title: string;
  author: string;
  genre: string;
  year: string | number;
  ratings: IRating[];
  averageRating: number;
  imageUrl: string;
  userId: string;
}

const BOOK_MIN_RATE = 0;
const BOOK_MAX_RATE = 5;
const bookRateMongooseSpecs = { type: Number, required: true, min: BOOK_MIN_RATE, max: BOOK_MAX_RATE };

const ratingSchema: Schema<IRating> = new mongoose.Schema({
  userId: { type: String, required: true },
  grade: bookRateMongooseSpecs
});

const BOOK_STRING_FIELD_CONSTRAINT = {
  validator: bookStringFieldValidator,
  message: bookStringFieldValidatorMsg
};

export const BOOKS_STRING_FIELDS: (keyof BookDocument)[] = ['title', 'author', 'genre'];
const bookSchema: Schema<BookDocument> = new mongoose.Schema({
  title: { type: String, required: true, validate: BOOK_STRING_FIELD_CONSTRAINT },
  author: { type: String, required: true, validate: BOOK_STRING_FIELD_CONSTRAINT },
  genre: { type: String, required: true, validate: BOOK_STRING_FIELD_CONSTRAINT },
  year: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: yearValidator,
      message: yearValidatorMsg
    }
  },
  ratings: { type: [ratingSchema], required: true },
  averageRating: bookRateMongooseSpecs,
  imageUrl: { type: String, required: true },
  userId: { type: String, required: true }
});

bookSchema.index({ averageRating: -1 });

export default mongoose.model<BookDocument>('Book', bookSchema);
