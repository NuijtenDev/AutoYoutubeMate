import fs from 'fs';
import fetch from 'node-fetch';
import { google } from 'googleapis';
import readline from 'readline';

// Replace 'YOUR_CLIENT_ID' and 'YOUR_CLIENT_SECRET' with your OAuth client credentials
const clientId = '';
const clientSecret = '';
const redirectUri = 'urn:ietf:wg:oauth:2.0:oob'; // For console applications

// Replace 'YOUR_API_KEY' with your actual YouTube Data API key
const apiKey = '';

// Replace 'YOUR_PLAYLIST_TITLE' with the desired title for your playlist
const playlistTitle = 'D&B';

// List of video names to search for
const videoNames = ["Bou - Poison", "A.M.C - Look Out"];

// Number of videos to retrieve per search query (max 50 per request)
const maxResults = 1; // You can adjust this based on your needs

// Function to authenticate with OAuth 2.0
async function authenticate() {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Generate authentication URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
  });

  console.log('Authorize this app by visiting this URL:', authUrl);

  // Get authorization code from the user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question('Enter the code from the page here: ', (code) => {
      rl.close();
      resolve(code);
    });
  });

  // Get access token
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  return oauth2Client;
}

// Function to fetch and process YouTube videos based on names
async function fetchYouTubeVideosByNames() {
  try {
    // Step 1: Authenticate with OAuth 2.0
    const authClient = await authenticate();

    // Step 2: Create a new playlist
    const youtube = google.youtube({ version: 'v3', auth: authClient });
    const createPlaylistResponse = await youtube.playlists.insert({
      part: 'snippet',
      resource: {
        snippet: {
          title: playlistTitle,
          description: 'Playlist created using the YouTube Data API',
        },
      },
    });

    const playlistId = createPlaylistResponse.data.id;
    console.log(`Playlist created with ID: ${playlistId}`);

    // Step 3: Add videos to the playlist
    for (const videoName of videoNames) {
      // YouTube Data API search endpoint
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(videoName)}&part=snippet,id&order=relevance&maxResults=${maxResults}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      // Check if there are any search results
      if (searchData.items && searchData.items.length > 0) {
        // Extract video ID from the search results
        const videoId = searchData.items[0].id.videoId;

        // Add the video to the playlist
        await youtube.playlistItems.insert({
          part: 'snippet',
          resource: {
            snippet: {
              playlistId: playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId,
              },
            },
          },
        });

        console.log(`Video added to the playlist: ${videoId}`);
      } else {
        console.log(`No search results found for "${videoName}".`);
      }
    }

    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    console.log(`Playlist URL: ${playlistUrl}`);
    console.log('Videos added to the playlist successfully!');
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
  }
}

// Call the function to fetch YouTube videos based on names and create a playlist
fetchYouTubeVideosByNames();
