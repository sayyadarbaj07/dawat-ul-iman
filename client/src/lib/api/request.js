export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "https://dawat-ul-iman.onrender.com/api");

export async function request(path, options = {}, retries = 1) {
  const token = localStorage.getItem("dawat_token");
  
  const headers = {
    ...(options.headers || {}),
  };
  
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers,
      ...options,
    });
  } catch (err) {
    if (retries > 0) {
      await new Promise((res) => setTimeout(res, 600));
      return request(path, options, retries - 1);
    }
    const error = new Error(err.message === "Failed to fetch" ? "Server se connect nahi ho saka. Kripya check karein ki backend server chal raha hai." : err.message);
    throw error;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || "Request failed";
    const error = new Error(errorMsg);
    error.response = { data };
    error.status = response.status;
    throw error;
  }

  return data;
}
