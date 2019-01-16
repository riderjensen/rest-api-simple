const { validationResult } = require('express-validator/check');

const Post = require('../models/post');

exports.getPosts = (req, res, next) => {
	res.status(200).json({
		posts: [{
			_id: 3,
			title: 'This is the first title',
			content: 'This is the fist content',
			imageUrl: 'images/spider.png',
			creator: {
				name: 'Rider',
			},
			createdAt: new Date(),
		}]
	});
};

exports.createPost = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(422).json({
			message: 'Validation failed. Try again with better data', errors: errors.array(),
		})
	}
	const title = req.body.title;
	const content = req.body.content;
	// create post in db
	const post = Post({
		title: title,
		content: content,
		imageUrl: 'images/spider.png',
		creator: { name: 'Rider' },
	});
	post.save()
		.then(result => {
			console.log(result);
			res.status(201).json({
				message: 'Post created',
				post: result
			})
		})
		.catch(err => console.log(err));

};