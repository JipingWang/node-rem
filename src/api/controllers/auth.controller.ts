export {};
import { NextFunction, Request, Response, Router } from 'express';
const httpStatus = require('http-status');
import { User } from 'api/models';
const RefreshToken = require('../models/refreshToken.model');
const moment = require('moment-timezone');
import { apiJson } from 'api/utils/Utils';
import { sendEmail, welcomeEmail, slackWebhook } from 'api/utils/MsgUtils';
const { JWT_EXPIRATION_MINUTES, EMAIL_MAILGUN_API_KEY } = require('../../config/vars');

/**
 * Returns a formated object with tokens
 * @private
 */
function generateTokenResponse(user: any, accessToken: string) {
  const tokenType = 'Bearer';
  const refreshToken = RefreshToken.generate(user).token;
  const expiresIn = moment().add(JWT_EXPIRATION_MINUTES, 'minutes');
  return {
    tokenType,
    accessToken,
    refreshToken,
    expiresIn
  };
}

/**
 * Returns jwt token if registration was successful
 * @public
 */
exports.register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await new User(req.body).save();
    const userTransformed = user.transform();
    const token = generateTokenResponse(user, user.token());
    res.status(httpStatus.CREATED);
    const data = { token, user: userTransformed };
    slackWebhook(`New User: ${user.email}`) // notify when new user registered
    if (EMAIL_MAILGUN_API_KEY) {
      // for testing: it can only email to "authorized recipients" in Mailgun Account Settings.
      // sendEmail(welcomeEmail({ name: user.email, email: user.email }));
    }
    return apiJson({ req, res, data });
  } catch (error) {
    return next(User.checkDuplicateEmail(error));
  }
};

/**
 * Returns jwt token if valid username and password is provided
 * @public
 */
exports.login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user, accessToken } = await User.findAndGenerateToken(req.body);
    const token = generateTokenResponse(user, accessToken);
    const userTransformed = user.transform();
    const data = { token, user: userTransformed };
    return apiJson({ req, res, data });
  } catch (error) {
    return next(error);
  }
};

/**
 * login with an existing user or creates a new one if valid accessToken token
 * Returns jwt token
 * @public
 */
exports.oAuth = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { user } = req;
    const accessToken = user.token();
    const token = generateTokenResponse(user, accessToken);
    const userTransformed = user.transform();
    return res.json({ token, user: userTransformed });
  } catch (error) {
    return next(error);
  }
};

/**
 * Returns a new jwt when given a valid refresh token
 * @public
 */
exports.refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, refreshToken } = req.body;
    const refreshObject = await RefreshToken.findOneAndRemove({
      userEmail: email,
      token: refreshToken
    });
    const { user, accessToken } = await User.findAndGenerateToken({ email, refreshObject });
    const response = generateTokenResponse(user, accessToken);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
};
