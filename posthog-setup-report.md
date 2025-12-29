# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your Supawatch streaming catalog application. The integration includes comprehensive event tracking for user engagement, content consumption, search behavior, and conversion funnels. PostHog is initialized using the modern `instrumentation-client.js` approach recommended for Next.js 15.3+, with a reverse proxy configured to improve tracking reliability.

## Configuration Files Created/Modified

- **`.env`** - Added PostHog environment variables (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)
- **`instrumentation-client.js`** - Client-side PostHog initialization with exception capture and debug mode
- **`next.config.mjs`** - Added reverse proxy rewrites for PostHog to prevent ad-blocker interference

## Events Instrumented

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `movie_play_started` | User clicks the 'Play Movie' button to start watching a movie | `src/app/movie/[id]/MovieClient.jsx` |
| `tv_episode_play_started` | User clicks to play a TV series episode | `src/app/tv/[id]/TVClient.jsx` |
| `search_performed` | User performs a search query for movies or TV series | `src/app/search/page.js` |
| `filter_applied` | User applies search filters (media type, genre, sort) | `src/app/search/page.js` |
| `media_detail_dialog_opened` | User opens the media detail dialog to view movie/TV details | `src/app/components/MediaDetailDialog.jsx` |
| `watch_now_clicked` | User clicks 'Watch Now' button from media detail dialog | `src/app/components/MediaDetailDialog.jsx` |
| `genre_selected` | User clicks on a genre to browse movies in that category | `src/app/genre/components/Genres.jsx` |
| `recommendation_clicked` | User clicks on a recommended movie from 'More Like This' | `src/app/movie/[id]/MovieClient.jsx` |
| `tv_recommendation_clicked` | User clicks on a recommended TV series from 'More Like This' | `src/app/tv/[id]/TVClient.jsx` |
| `season_changed` | User changes the selected season when viewing a TV series | `src/app/tv/[id]/TVClient.jsx` |
| `cast_member_clicked` | User clicks on a cast member to view their profile | `src/app/person/[id]/PersonClient.jsx` |
| `filmography_item_clicked` | User clicks on a movie from an actor's filmography | `src/app/person/[id]/PersonClient.jsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://eu.posthog.com/project/111074/dashboard/470881) - Core analytics dashboard tracking user engagement, content consumption, and conversion funnels

### Insights
- [Content Plays Over Time](https://eu.posthog.com/project/111074/insights/bihsnyvG) - Daily movie and TV episode play events
- [Search to Play Conversion Funnel](https://eu.posthog.com/project/111074/insights/nBqo9hBo) - Funnel tracking users from search through to content playback
- [Genre Popularity](https://eu.posthog.com/project/111074/insights/JDZz8pCi) - Most selected genres by users
- [Recommendation Engagement](https://eu.posthog.com/project/111074/insights/OsVP3uQ7) - Tracks how often users engage with recommended content
- [Search Activity](https://eu.posthog.com/project/111074/insights/T9V4jn34) - Search volume and filter usage patterns

## Additional Notes

- Exception capturing is enabled via `capture_exceptions: true` to automatically track JavaScript errors
- The reverse proxy is configured for the EU region (`eu.i.posthog.com` and `eu-assets.i.posthog.com`)
- Debug mode is automatically enabled in development environment
- All events include rich properties (IDs, titles, genres, ratings) for detailed analysis
