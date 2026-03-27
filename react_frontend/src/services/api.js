const BASE_URL = "http://localhost:5001/api";

export const scanWebsite = async (url) => {
  const res = await fetch(`${BASE_URL}/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Scan failed");
  }

  return data;
};

export const downloadReport = async (payload) => {
  const res = await fetch(`${BASE_URL}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Download failed");
  }

  return await res.blob();
};