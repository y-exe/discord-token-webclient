export const API_URL = "https://dapi.yexe.xyz/";

export const getProxyUrl = (url) => {
  return url;
};

export const formatTimestamp = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'});
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString('ja-JP')} ${time}`;
};