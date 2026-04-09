/**
 * Fetch a food photo URL from Unsplash for a given meal name.
 * Returns empty string if the key is missing or the request fails.
 */
export async function fetchFoodImage(
  mealName: string,
  accessKey: string,
): Promise<string> {
  if (!accessKey) return '';
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(mealName + ' food')}&per_page=1&orientation=landscape&client_id=${accessKey}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const data = (await res.json()) as {
      results: { urls: { small: string } }[];
    };
    return data.results[0]?.urls?.small ?? '';
  } catch {
    return '';
  }
}
