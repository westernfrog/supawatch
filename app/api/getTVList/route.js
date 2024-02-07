export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get("list");
    const page = searchParams.get("page");
    const url = `https://api.themoviedb.org/3/tv/${list}?language=en-US&page=${page}`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmODliYjhlMjAxZTM0ZWUzNGI2MDMxNzViNTEwNWNmNCIsInN1YiI6IjY1MzRmZTJhMmIyMTA4MDExZGRmYTUyZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.PpvmRIVABx59fL8VdR3hnQsVt8-sMbHDvJ2xvvjtv0Q",
      },
    };

    const response = await fetch(url, options, { cache: "force-cache" });
    const data = await response.json();
    return Response.json({ data });
  } catch (error) {
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const revalidate = 10;
