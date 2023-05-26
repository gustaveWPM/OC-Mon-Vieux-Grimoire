import mongoose, { Document, Schema } from 'mongoose';
import { validator as bookStringFieldValidator, message as bookStringFieldValidatorMsg } from '../lib/bookStringFieldValidator';
import { validator as yearValidator, message as yearValidatorMsg } from '../lib/yearValidator';

export interface BookRating extends Document {
  userId: string;
  grade: number;
}

export interface BookDocument extends Document {
  title: string;
  author: string;
  genre: string;
  year: string | number;
  ratings: BookRating[];
  averageRating: number;
  imageUrl: string;
  userId: string;
}

export const BOOKS_REQUIRED_STRING_INPUT_FIELDS: (keyof BookDocument)[] = ['title', 'author', 'genre'];
export const BOOKS_OPTIONAL_STRING_INPUT_FIELDS: (keyof BookDocument)[] = [];

const BOOK_MIN_RATE = 0;
const BOOK_MAX_RATE = 5;
const bookRateMongooseSpecs = { type: Number, required: true, min: BOOK_MIN_RATE, max: BOOK_MAX_RATE };

const ratingSchema: Schema<BookRating> = new mongoose.Schema({
  userId: { type: String, required: true },
  grade: bookRateMongooseSpecs
});

const BOOK_STRING_INPUT_FIELD_CONSTRAINT = {
  validator: bookStringFieldValidator,
  message: bookStringFieldValidatorMsg
};

type NaiveSchemaRuleset = Record<string, unknown>;

namespace Helpers {
  export function injectBookStringInputFields(bookSchemaRuleset: NaiveSchemaRuleset) {
    const bookSchemaStringInputFieldRulesetBase: NaiveSchemaRuleset = {
      type: String,
      validate: BOOK_STRING_INPUT_FIELD_CONSTRAINT
    };

    for (const requiredStringField of BOOKS_REQUIRED_STRING_INPUT_FIELDS) {
      bookSchemaRuleset[requiredStringField] = {
        ...bookSchemaStringInputFieldRulesetBase,
        required: true
      };
    }

    for (const optionalStringField of BOOKS_OPTIONAL_STRING_INPUT_FIELDS) {
      bookSchemaRuleset[optionalStringField] = bookSchemaStringInputFieldRulesetBase;
    }
  }
}

const bookSchemaRuleset: NaiveSchemaRuleset = {
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
};

Helpers.injectBookStringInputFields(bookSchemaRuleset);

const bookSchema: Schema<BookDocument> = new mongoose.Schema(bookSchemaRuleset);
bookSchema.index({ averageRating: -1 });

export default mongoose.model<BookDocument>('Book', bookSchema);
