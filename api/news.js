import { getNews } from "../lib/news.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "GET 요청만 사용할 수 있습니다." });
  }

  try {
    const data = await getNews({
      category: request.query.category,
      apiKey: process.env.GNEWS_API_KEY
    });
    response.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=120");
    return response.status(200).json(data);
  } catch (error) {
    return response.status(error.status || 500).json({
      error: error.message || "예상하지 못한 오류가 발생했습니다."
    });
  }
}

