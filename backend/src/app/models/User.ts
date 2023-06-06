import { Document, Schema, model } from 'mongoose';
import {validator as emailValidator, message as emailValidatorMsg} from '../lib/emailValidator'
import uniqueValidator from 'mongoose-unique-validator';

export interface UserDocument extends Document {
  email: string;
  password: string;
}

const userSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: emailValidator,
      message: emailValidatorMsg
    }
  },

  password: { type: String, required: true }
});

userSchema.plugin(uniqueValidator);
userSchema.index({ email: 'text' });

export default model<UserDocument>('User', userSchema);
