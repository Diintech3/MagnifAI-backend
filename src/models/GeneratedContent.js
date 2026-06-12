const mongoose = require("mongoose");

const generatedContentSchema = new mongoose.Schema(
  {
    appId: { type: mongoose.Schema.Types.ObjectId, ref: "App", required: true, index: true },

    // CEO Info
    ceoName:        { type: String, required: true, trim: true },
    company:        { type: String, trim: true },
    website:        { type: String, trim: true },
    industry:       { type: String, trim: true },
    brandVoice:     { type: String, trim: true },
    targetAudience: { type: String, trim: true },
    country:        { type: String, trim: true },

    // Content Input
    topic:           { type: String, required: true, trim: true },
    domain:          { type: String, required: true, trim: true },
    contentType:     { type: String, required: true, trim: true },
    platform:        { type: String, required: true, trim: true },
    platforms:       [{ type: String, trim: true }],
    tone:            { type: String, required: true, trim: true },
    language:        { type: String, required: true, trim: true },
    wordCount:       { type: Number, required: true },
    primaryKeyword:  { type: String, trim: true },
    secondaryKeyword:{ type: String, trim: true },
    targetLocation:  { type: String, trim: true },

    // AI Options
    options: {
      seoOptimized:        { type: Boolean, default: true },
      aeoOptimized:        { type: Boolean, default: true },
      geoOptimized:        { type: Boolean, default: false },
      humanized:           { type: Boolean, default: true },
      addCta:              { type: Boolean, default: true },
      addHashtags:         { type: Boolean, default: true },
      addFaq:              { type: Boolean, default: false },
      generateImagePrompt: { type: Boolean, default: true },
      generateVideoScript: { type: Boolean, default: false },
      addMetaTitle:        { type: Boolean, default: true },
      addMetaDesc:         { type: Boolean, default: true },
      addInternalLinks:    { type: Boolean, default: false },
      addExternalRefs:     { type: Boolean, default: false },
    },

    // AI Output
    output: {
      title:         { type: String },
      metaTitle:     { type: String },
      metaDesc:      { type: String },
      slug:          { type: String },
      keywords:      [{ type: String }],
      content:       { type: String },
      hashtags:      [{ type: String }],
      cta:           { type: String },
      faq:           { type: String },
      imagePrompt:   { type: String },
      videoPrompt:   { type: String },
      internalLinks: [{ type: String }],
      externalRefs:  [{ type: String }],
      scores: {
        seo:         { type: Number },
        aeo:         { type: Number },
        geo:         { type: Number },
        readability: { type: Number },
        humanScore:  { type: Number },
        aiDetection: { type: Number },
        originality: { type: Number },
      },
    },

    // Platform formatted versions
    formatted: {
      linkedin:   { type: String },
      twitter:    { type: String },
      instagram:  { type: String },
      facebook:   { type: String },
      reddit:     { type: String },
      quora:      { type: String },
      medium:     { type: String },
      youtube:    { type: String },
      threads:    { type: String },
      substack:   { type: String },
    },

    // Workflow
    status: {
      type: String,
      enum: ["draft","pending","approved","assigned","published","verified","completed","rejected","scheduled"],
      default: "draft",
      index: true,
    },
    priority:       { type: String, enum: ["low","medium","high","urgent"], default: "medium" },
    assignedTo:     { type: String, trim: true },
    assignedBy:     { type: String, trim: true },
    deadline:       { type: Date },
    instructions:   { type: String, trim: true },
    publishedAt:    { type: Date },
    scheduledAt:    { type: Date },
    verificationUrl:{ type: String, trim: true },
    screenshotUrl:  { type: String, trim: true },

    // Analytics
    views:     { type: Number, default: 0 },
    impressions:{ type: Number, default: 0 },
    clicks:    { type: Number, default: 0 },
    shares:    { type: Number, default: 0 },
    comments:  { type: Number, default: 0 },
    mentions:  { type: Number, default: 0 },

    // Folder
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "ContentFolder", default: null, index: true },

    // Matrix batch flag
    matrixBatch:   { type: Boolean, default: false },
    matrixBatchId: { type: String },
  },
  { timestamps: true }
);

generatedContentSchema.index({ appId: 1, createdAt: -1 });
generatedContentSchema.index({ appId: 1, status: 1 });
generatedContentSchema.index({ appId: 1, domain: 1, contentType: 1 });
generatedContentSchema.index({ appId: 1, assignedTo: 1 });

const GeneratedContent = mongoose.models.GeneratedContent || mongoose.model("GeneratedContent", generatedContentSchema);
module.exports = { GeneratedContent };
