export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const url = `https://api.themoviedb.org/3/movie/${id}/videos?language=en-US`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmODliYjhlMjAxZTM0ZWUzNGI2MDMxNzViNTEwNWNmNCIsInN1YiI6IjY1MzRmZTJhMmIyMTA4MDExZGRmYTUyZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.PpvmRIVABx59fL8VdR3hnQsVt8-sMbHDvJ2xvvjtv0Q",
      },
    };

    const response = await fetch(url, options);
    const data = await response.json();

    return Response.json({ key: data.results[0].key });
  } catch (error) {
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const revalidate = 10;
