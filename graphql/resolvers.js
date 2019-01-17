const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');

module.exports = {
	createUser: async function ({ userInput }, req) {
		const errors = [];
		if (!validator.isEmail(userInput.email)) {
			errors.push({ message: 'Email is invalid' });
		}
		if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
			errors.push({ message: 'Password is too short' });
		}
		if (errors.length > 0) {
			const error = new Error('Invalid Input');
			error.data = errors;
			error.code = 422;
			throw error;
		}
		const existingUser = await User.findOne({ email: userInput.email });
		if (existingUser) {
			const error = new Error('User exists already');
			throw error;
		}
		const hashedPW = await bcrypt.hash(userInput.password, 12);
		const user = new User({
			email: userInput.email,
			name: userInput.name,
			password: hashedPW
		});
		const createdUser = await user.save();
		return { ...createdUser._doc, _id: createdUser._id.toString() };
	},
	login: async function ({ email, password }) {
		const user = await User.findOne({ email, email });
		if (!user) {
			const error = new Error('User not found');
			error.code = 401;
			throw error;
		}
		const isEqual = await bcrypt.compare(password, user.password);
		if (!isEqual) {
			const error = new Error('Password is incorrect');
			error.code = 401;
			throw error;
		}
		const token = jwt.sign({
			userId: user._id.toString(),
			email: user.email
		}, 'secret password', { expiresIn: '1hr' });
		return {
			token: token,
			userId: user._id.toString()
		}
	},
	createPost: async function ({ postInput }, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}
		const errors = [];
		if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
			errors.push({ message: 'Title is invalid' });

		}
		if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
			errors.push({ message: 'Content is invalid' });

		}
		if (errors.length > 0) {
			const error = new Error('Invalid Input');
			error.data = errors;
			error.code = 422;
			throw error;
		}
		const user = await User.findById(req.userId);
		if (!user) {
			const error = new Error('Invalid User');
			error.code = 401;
			throw error;
		}
		const post = new Post({
			title: postInput.title,
			content: postInput.content,
			imageUrl: postInput.imageUrl,
			creator: user
		});
		const createdPost = await post.save();
		user.posts.push(post);
		await user.save();
		return { ...createdPost._doc, _id: createdPost._id.toString(), createdAt: createdPost.createdAt.toISOString(), updatedAt: createdPost.updatedAt.toISOString() }
	},
	posts: async function ({ page }, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}
		if (!page) {
			page = 1;
		}
		const perPage = 2;
		const totalPosts = await Post.find().countDocuments();
		const posts = await Post.find().skip((page - 1) * perPage).limit(perPage).sort({ createdAt: -1 }).populate('creator');
		return {
			posts: posts.map(item => {
				return { ...item._doc, _id: item._id.toString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }
			}), totalPosts: totalPosts

		}
	}
}
