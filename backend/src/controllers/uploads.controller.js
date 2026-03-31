const { randomUUID } = require('crypto');
const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || 'avatars';
const RESOURCE_BUCKET = process.env.SUPABASE_RESOURCE_BUCKET || 'resource-files';

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const getExtension = (file) => {
  if (EXT_BY_MIME[file.mimetype]) return EXT_BY_MIME[file.mimetype];
  const original = file.originalname || '';
  const split = original.split('.');
  return split.length > 1 ? split.pop().toLowerCase() : 'bin';
};

const uploadAndResolveUrl = async (bucket, filePath, file) => {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw new ApiError(400, uploadError.message);
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicUrl = publicData?.publicUrl || null;

  if (publicUrl) {
    return { filePath, url: publicUrl };
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  if (signedError || !signedData?.signedUrl) {
    throw new ApiError(400, signedError?.message || 'Failed to generate uploaded file URL.');
  }

  return { filePath, url: signedData.signedUrl };
};

const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      throw new ApiError(400, 'Avatar file is required.');
    }

    const extension = getExtension(file);
    const filePath = `${userId}/avatar-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const { url } = await uploadAndResolveUrl(AVATAR_BUCKET, filePath, file);

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new ApiError(400, updateError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        url,
        path: filePath,
        bucket: AVATAR_BUCKET,
        profile,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const uploadResourceFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      throw new ApiError(400, 'Resource file is required.');
    }

    const extension = getExtension(file);
    const filePath = `${userId}/resource-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const { url } = await uploadAndResolveUrl(RESOURCE_BUCKET, filePath, file);

    res.status(201).json({
      success: true,
      data: {
        url,
        path: filePath,
        bucket: RESOURCE_BUCKET,
        filename: file.originalname,
        content_type: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  uploadAvatar,
  uploadResourceFile,
};
