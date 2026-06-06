const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    appId:     { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },
    title:     { type: String, required: true, trim: true },
    category:  { type: String, default: "News", trim: true },
    author:    { type: String, trim: true },
    summary:   { type: String, trim: true },
    content:   { type: String, required: true },
    tags:      [{ type: String, trim: true }],
    mediaUrls: [{ type: String, trim: true }],
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
module.exports = { Post };
