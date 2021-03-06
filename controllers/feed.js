const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../socket');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
	const currentPage = req.query.page || 1;
	const perPage = 2;
	try {
		const totalItems = await Post.find().countDocuments();
		const posts = await Post.find({ createdAt: -1 }).populate('creator').sort().skip((currentPage - 1) * perPage).limit(perPage);
		res.status(200).json({ message: 'Fetched posts', posts: posts, totalItems: totalItems });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.createPost = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const error = new Error('Validation failed. Try again with better data.');
		error.statusCode = 422;
		throw error;
	}
	if (!req.file) {
		const error = new Error('No image provided.');
		error.statusCode = 422;
		throw error;
	}
	const title = req.body.title;
	const content = req.body.content;
	const imageUrl = req.file.path.replace("\\", "/");
	const creator = req.userId;

	// create post in db
	const post = Post({
		title: title,
		content: content,
		imageUrl: imageUrl,
		creator: req.userId,
	});

	try {
		await post.save()
		const myUser = await User.findById(req.userId);
		myUser.posts.push(post);
		await myUser.save();
		io.getIO().emit('posts', { action: 'create', post: { ...post._doc, creator: { _id: req.userId, name: user.name } } });
		res.status(201).json({
			message: 'Post created',
			post: post,
			creator: { _id: creator._id, name: creator.name }
		})

	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}

};

exports.getPost = async (req, res, next) => {
	const postId = req.params.postId;
	try {
		const post = Post.findById(postId)

		if (!post) {
			const error = new Error('Could not find post');
			error.statusCode = 404;
			throw error;
		}
		res.status(200).json({ message: 'Post fetched', post: post })
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
}

exports.updatePost = async (req, res, next) => {
	const postId = req.params.postId;
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const error = new Error('Validation failed. Try again with better data.');
		error.statusCode = 422;
		throw error;
	}
	const title = req.body.title;
	const content = req.body.content;
	let imageUrl = req.body.image;
	if (req.file) {
		imageUrl = req.file.path;
	}
	if (!imageUrl) {
		const error = new Error('No file picked');
		error.statusCode = 404;
		throw error;
	}
	try {
		const post = await Post.findById(postId).populate('creator');

		if (!post) {
			const error = new Error('Could not find post');
			error.statusCode = 404;
			throw error;
		}
		if (post.creator._id.toString() !== req.userId) {
			const error = new Error('Not authorized');
			error.statusCode = 403;
			throw error;
		}
		if (imageUrl !== post.imageUrl) {
			clearImage(post.imageUrl);
		}
		imageUrl = req.file.path.replace("\\", "/");
		post.title = title;
		post.imageUrl = imageUrl;
		post.content = content;
		const savedPost = post.save();
		io.getIO().emit('posts', { action: 'update', post: savedPost })
		res.status(200).json({ message: 'Post updated', post: savedPost })

	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}

};

exports.deletePost = async (req, res, next) => {
	const postId = req.params.postId;
	try {

		const post = await Post.findById(postId);
		if (!post) {
			const error = new Error('Could not find post');
			error.statusCode = 404;
			throw error;
		}
		if (post.creator.toString() !== req.userId) {
			const error = new Error('Not authorized');
			error.statusCode = 403;
			throw error;
		}
		clearImage(post.imageUrl);

		await Post.findByIdAndRemove(postId);
		const user = await User.findById(req.userId);
		user.posts.pull(postId);
		await user.save();
		io.getIO().emit('posts', { action: 'delete', post: postId });
		res.status(200).json({ message: 'post deleted' });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}

}

const clearImage = filePath => {
	filePath = path.join(__dirname, '..', filePath);
	fs.unlink(filePath, err => console.log(err));
};