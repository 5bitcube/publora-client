// Publora Client
// A NodeJS application for interacting with Publora's API by @5bitcube.

let axios;
try {
  axios = require('axios');
} catch (_) {
  console.error('Error: Axios package not found.');
  console.error('Run "npm install axios" to install it.');
  process.exit(1);
}
const fs    = require('fs');
const path  = require('path');
const mime  = require('mime-types');

const config  = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const API_KEY = config.API_KEY;

////////////////////////////////////////////////////////////////////////////////
const args = process.argv.slice(2);

// HELP
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
How to use:

1. Add your API key to config.json:
   {
     "API_KEY": "your_api_key_here"
   }

2. Connect your social media accounts:
   publora --get-accounts
   (shorter version: publora -g)

3. Create posts like this:
   publora -p PLATFORM -u USERNAME [options]

   You can add these options:
   -c "CAPTION"    The text you want to post (in quotes)
   -i file1,file2  List of images to post (separated by commas)
   -v video.mp4    A video file to post
   -t seconds      How long to wait before posting (in seconds)

   Example:
   publora -p twitter -u 5bitcube -c "Hello world!" -i image1.jpg`);
  process.exit(0);
}

// GET ACCOUNTS
if (args.includes('--get-accounts') || args.includes('-g')) {
  getConnectedAccounts();
  return;
}

if (args.includes('-p')) {
  (async () => {
    const opt = {};
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '-p': opt.platform = args[i + 1]; i++; break;
        case '-u': opt.username = args[i + 1]; i++; break;
        case '-c': opt.caption  = args[i + 1]; i++; break;
        case '-i': opt.images   = args[i + 1]; i++; break;
        case '-v': opt.video    = args[i + 1]; i++; break;
        case '-t': opt.delaySec = parseInt(args[i + 1], 10) || 0; i++; break;
        default: break;
      }
    }

    if (!opt.platform) {
      console.error('Missing -p [platform]');
      process.exit(1);
    }

    const platformId = resolvePlatformId(opt.platform, opt.username);
    if (!platformId) {
      console.error('Unable to resolve platformId for given platform/username');
      process.exit(1);
    }

    const imagesArr = opt.images 
      ? opt.images.split(',').map(s => s.trim()).filter(Boolean) 
      : [];

    // base delay from -t plus 5 seconds buffer per image
    const baseDelay   = opt.delaySec || 0;
    const totalDelay  = baseDelay + imagesArr.length * 5;
    const scheduledTime = new Date(Date.now() + totalDelay * 1000).toISOString();

    // Step 1: create post
    const postGroupId = await createPost({ 
      platformId, 
      caption: opt.caption, 
      scheduledTime 
    });

    // Step 2: upload media if provided
    for (const img of imagesArr) {
      await uploadMedia(img, 'image', postGroupId);
    }
    if (opt.video) {
      await uploadMedia(opt.video, 'video', postGroupId);
    }
  })();
  return;
}

// If this line is reached, no valid command was executed
console.error('Unknown or incomplete command. Use --help for usage.');

////////////////////////////////////////////////////////////////////////////////

// Fetch connected accounts and save their platform IDs to config.json
async function getConnectedAccounts() {
  try {
    const response = await axios.get(
      'https://api.publora.com/api/v1/platform-connections',
      { headers: { 'x-publora-key': API_KEY } }
    );

    const connections = Array.isArray(response.data) 
      ? response.data 
      : (response.data.connections || []);
    
    console.log('Connected accounts:');
    connections.forEach(acc => 
      console.log(`  ${acc.username}  ->  ${acc.platformId}`)
    );

    const cfg = fs.existsSync('config.json') 
      ? JSON.parse(fs.readFileSync('config.json', 'utf-8')) 
      : {};
    const mergedMap = {};
    
    (cfg.accounts || []).forEach(acc => mergedMap[acc.platformId] = acc);
    
    connections.forEach(acc => {
      if (acc.platformId) {
        mergedMap[acc.platformId] = {
          username: acc.username,
          platformId: acc.platformId
        };
      }
    });

    const mergedAccounts = Object.values(mergedMap);
    cfg.accounts = mergedAccounts;
    
    if (cfg.platformIds) delete cfg.platformIds;

    fs.writeFileSync('config.json', JSON.stringify(cfg, null, 2));
  } catch (error) {
    console.error(
      'Error fetching connected accounts:', 
      error.response?.data || error.message
    );
  }
}

// Helper to resolve platformId from saved accounts (case-insensitive, supports aliases)
function resolvePlatformId(platform, username) {
  if (!platform) return null;

  // normalize case once
  const pLower = platform.toLowerCase();
  const uLower = username ? username.toLowerCase() : null;

  const aliasMap = { x: 'twitter' };
  const canonicalPrefix = aliasMap[pLower] || pLower;

  const cfg = fs.existsSync('config.json')
    ? JSON.parse(fs.readFileSync('config.json', 'utf-8'))
    : {};
  const accounts = cfg.accounts || [];

  const match = accounts.find(acc => {
    const prefixOk = acc.platformId.startsWith(canonicalPrefix);
    const userOk   = uLower ? acc.username === uLower : true;
    return prefixOk && userOk;
  });
  return match ? match.platformId : null;
}

// Create post via Publora API
async function createPost({ platformId, caption, scheduledTime }) {
  try {
    const payload = {
      content: caption || '',
      scheduledTime: scheduledTime || new Date().toISOString(),
      platforms: [platformId]
    };

    const response = await axios.post(
      'https://api.publora.com/api/v1/create-post', payload, {
        headers: {
          'x-publora-key': API_KEY,
          'Content-Type': 'application/json'
        }
    });

    console.log('Post scheduled. Post Group ID:', response.data.postGroupId);
    return response.data.postGroupId;
  } catch (error) {
    console.error('Error posting:', error.response?.data || error.message);
    throw error;
  }
}

// Upload media (image or video) following Publora API docs
async function uploadMedia(filePath, type, postGroupId) {
  try {
    const fileName = path.basename(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    // Step 1: get upload URL
    const urlResp = await axios.post(
      'https://api.publora.com/api/v1/get-upload-url', {
        fileName,
        contentType,
        type,
        postGroupId
    }, {
      headers: {
        'x-publora-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const { uploadUrl } = urlResp.data;

    // Step 2: upload file
    const fileBuffer = fs.readFileSync(filePath);
    await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'Content-Type': contentType
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log(`Uploaded ${type}: ${fileName}`);
  } catch (err) {
    console.error(`Error uploading ${type} ${filePath}:`,
      err.response?.data || err.message);
    throw err;
  }
}