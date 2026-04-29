
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

let supabase = null;

const getConfig = () => ({
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_KEY,
  bucketName: process.env.SUPABASE_BUCKET_NAME || 'meeting-audio',
});

const initSupabase = () => {
  const config = getConfig();

  if (!config.url || !config.serviceKey) {
    logger.warn('⚠️ Supabase credentials not configured. Using local storage fallback.');
    return null;
  }

  if (!supabase) {
    supabase = createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    logger.info('✅ Supabase client initialized');
  }

  return supabase;
};

const uploadAudioToSupabase = async (localFilePath, meetingId) => {
  try {
    const client = initSupabase();

    if (!client) {
      logger.warn('⚠️ Supabase not configured, using local storage');
      return { success: false, error: 'Supabase not configured' };
    }

    const fileBuffer = await fs.readFile(localFilePath);
    const extension = path.extname(localFilePath);
    const filename = `${meetingId}${extension}`;
    const storagePath = `audio/${filename}`;

    logger.info(
      `📤 Uploading to Supabase: ${storagePath} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`
    );

    const config = getConfig();
    const { error } = await client.storage.from(config.bucketName).upload(storagePath, fileBuffer, {
      contentType: 'audio/wav',
      upsert: true,
    });

    if (error) {
      logger.error(`❌ Supabase upload error: ${error.message}`);
      return { success: false, error: error.message };
    }

    const { data: urlData } = client.storage.from(config.bucketName).getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;

    logger.info(`✅ Audio uploaded to Supabase: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      path: storagePath,
      size: fileBuffer.length,
    };
  } catch (error) {
    logger.error(`❌ Upload to Supabase failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const deleteAudioFromSupabase = async (storagePath) => {
  try {
    const client = initSupabase();

    if (!client) {
      return { success: false, error: 'Supabase not configured' };
    }

    const config = getConfig();

    let pathToDelete = storagePath;
    if (storagePath.startsWith('http')) {

      const urlParts = storagePath.split(`${config.bucketName}/`);
      pathToDelete = urlParts[1] || storagePath;
    }

    logger.info(`🗑️ Deleting from Supabase: ${pathToDelete}`);

    const { error } = await client.storage.from(config.bucketName).remove([pathToDelete]);

    if (error) {
      logger.error(`❌ Supabase delete error: ${error.message}`);
      return { success: false, error: error.message };
    }

    logger.info(`✅ Audio deleted from Supabase: ${pathToDelete}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Delete from Supabase failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const getSignedAudioUrl = async (storagePath, expiresIn = 3600) => {
  try {
    const client = initSupabase();

    if (!client) {
      return { success: false, error: 'Supabase not configured' };
    }

    const config = getConfig();

    let pathToSign = storagePath;
    if (storagePath.startsWith('http')) {
      const urlParts = storagePath.split(`${config.bucketName}/`);
      pathToSign = urlParts[1] || storagePath;
    }

    const { data, error } = await client.storage
      .from(config.bucketName)
      .createSignedUrl(pathToSign, expiresIn);

    if (error) {
      logger.error(`❌ Signed URL error: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    logger.error(`❌ Get signed URL failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const isSupabaseConfigured = () => {
  const config = getConfig();
  return !!(config.url && config.serviceKey);
};

const downloadAudioFromSupabase = async (storagePath, localPath) => {
  try {
    const client = initSupabase();

    if (!client) {
      return { success: false, error: 'Supabase not configured' };
    }

    const config = getConfig();

    let pathToDownload = storagePath;
    if (storagePath.startsWith('http')) {
      const urlParts = storagePath.split(`${config.bucketName}/`);
      pathToDownload = urlParts[1] || storagePath;
    }

    logger.info(`📥 Downloading from Supabase: ${pathToDownload}`);

    const { data, error } = await client.storage.from(config.bucketName).download(pathToDownload);

    if (error) {
      logger.error(`❌ Supabase download error: ${error.message}`);
      return { success: false, error: error.message };
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    await fs.writeFile(localPath, buffer);

    logger.info(`✅ Audio downloaded to: ${localPath}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Download from Supabase failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  uploadAudioToSupabase,
  deleteAudioFromSupabase,
  getSignedAudioUrl,
  downloadAudioFromSupabase,
  isSupabaseConfigured,
  initSupabase,
};
