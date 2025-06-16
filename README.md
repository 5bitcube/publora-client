# Publora Client

Publora Client is a NodeJS application designed to interact with Publora's API from the command line, or by integrating it programmatically in another projects. It allows the user to easily upload social media posts across different platforms such as: X (Twitter), Instagram, Tiktok, Youtube and Facebook. To learn more about it, visit the official website [https://publora.com](https://publora.com).

## Tested Platforms

| X (Twitter) | Instagram | TikTok | YouTube | Facebook |
|:-----------:|:---------:|:------:|:-------:|:--------:|
|     ✅      |    ❌     |   ❌   |   ❌    |    ❌    |


## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/5bitcube/publora-client.git
   cd publora-client
   ```

2. Install Node.js (if not already installed):

   - Download and install from [https://nodejs.org/](https://nodejs.org/)
   - Verify installation:
     ```sh
     node -v
     npm -v
     ```

3. Install dependencies from publora-client's folder:

   ```sh
   npm install axios
   ```
## How to use

1. Add your API key to config.json:

   ```sh
   {
     "API_KEY": "your_api_key_here"
   }
   ```
   API key is found at https://app.publora.com/dashboard/settings

2. Connect your social media accounts:

   ```sh
   publora --get-accounts
   (shorter version: publora -g)
   ```

3. Create posts like this:

   ```sh
   publora -p PLATFORM -u USERNAME [options]

   You can add these options:
   -c "CAPTION"    The text you want to post (in quotes)
   -i file1,file2  List of images to post (separated by commas)
   -v video.mp4    A video file to post
   -t seconds      How long to wait before posting (in seconds)

   Example:
   publora -p twitter -u 5bitcube -c "Hello world!" -i image1.jpg
   ```

## License

The Unlicense