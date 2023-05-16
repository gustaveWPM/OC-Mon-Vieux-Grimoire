import mongoose, { Document, Schema } from 'mongoose';
import { validator as alphaNumFieldValidator, message as alphaNumFieldValidatorMsg } from '../lib/AlphaNumFieldValidator';
import { validator as yearValidator, message as yearValidatorMsg } from '../lib/YearValidator';

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

const REQUIRE_AT_LEAST_ONE_ALPHANUM_CHAR_CONSTRAINT = {
  validator: alphaNumFieldValidator,
  message: alphaNumFieldValidatorMsg
};

const bookSchema: Schema<BookDocument> = new mongoose.Schema({
  userId: { type: String, required: true, validate: REQUIRE_AT_LEAST_ONE_ALPHANUM_CHAR_CONSTRAINT },
  title: { type: String, required: true, validate: REQUIRE_AT_LEAST_ONE_ALPHANUM_CHAR_CONSTRAINT },
  author: { type: String, required: true, validate: REQUIRE_AT_LEAST_ONE_ALPHANUM_CHAR_CONSTRAINT },
  year: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: yearValidator,
      message: yearValidatorMsg
    }
  },
  genre: { type: String, required: true, validate: REQUIRE_AT_LEAST_ONE_ALPHANUM_CHAR_CONSTRAINT },
  ratings: { type: [ratingSchema], required: true },
  averageRating: bookRateMongooseSpecs,
  imageUrl: { type: String, required: true }
});

bookSchema.index({ averageRating: -1 });

export default mongoose.model<BookDocument>('Book', bookSchema);
