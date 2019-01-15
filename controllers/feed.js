exports.getPosts = (req, res, next) => {
	res.status(200).json({
		posts: [{
			title: 'This is the title',
			content: 'This is the content'
		}]
	});
};