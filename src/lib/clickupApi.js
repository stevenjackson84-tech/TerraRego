import { getClickUpToken } from "./clickupAuth";

const BASE = "https://api.clickup.com/api/v2";

async function request(path, options = {}) {
  const token = getClickUpToken();
  if (!token) throw new Error("ClickUp not connected. Please add your API token.");

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.err || `ClickUp error ${res.status}`);
  return data;
}

export const clickupApi = {
  validateToken: () => request("/user"),
  getWorkspaces: () => request("/team"),
  getSpaces: (teamId) => request(`/team/${teamId}/space?archived=false`),
  getFolderlessLists: (spaceId) => request(`/space/${spaceId}/list?archived=false`),
  getTasks: (listId, params = {}) => {
    const q = new URLSearchParams({ include_closed: "false", ...params }).toString();
    return request(`/list/${listId}/task?${q}`);
  },
  getDashboards: (teamId) => request(`/team/${teamId}/dashboard`),
  createTask: (listId, data) =>
    request(`/list/${listId}/task`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
