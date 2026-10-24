// Hand-picked YouTube videos for songs the automatic search gets wrong.
// Spotify track id (open.spotify.com/track/<THIS>) → YouTube video id (youtube.com/watch?v=<THIS>).
// Applied on every sync, so they also fix videos that were already stored.
export const VIDEO_OVERRIDES: Record<string, string> = {
  // Dim Moon — The Weather: the search found someone else's short
  "3H7CwBK4W3MQGOnN0h5vic": "_Ed6rSBGnj0",
  // Good Night Sleep — Sunset: the search found an 8-hour white noise video
  "2VJbSC89djtVH9C1ljoQEn": "KaWhQF-27zU",
  // Sosega — En Casa (con Marina): not on YouTube, so another song of theirs (Aguacero, acoustic)
  // instead of the Ana Mena video the search found
  "1kG0UxwsJi6EDlNQPg4TPu": "b4LyYFh0y0k",
};
