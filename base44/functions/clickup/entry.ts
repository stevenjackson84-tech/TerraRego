import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CLICKUP_API = "https://api.clickup.com/api/v2";
const API_KEY = Deno.env.get("CLICKUP_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, ...params } = await req.json();

    const headers = {
      "Authorization": API_KEY,
      "Content-Type": "application/json",
    };

    // Get workspaces/teams
    if (action === "getWorkspaces") {
      const res = await fetch(`${CLICKUP_API}/team`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Get spaces for a team
    if (action === "getSpaces") {
      const res = await fetch(`${CLICKUP_API}/team/${params.teamId}/space?archived=false`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Get folders for a space
    if (action === "getFolders") {
      const res = await fetch(`${CLICKUP_API}/space/${params.spaceId}/folder?archived=false`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Get lists for a folder
    if (action === "getLists") {
      const res = await fetch(`${CLICKUP_API}/folder/${params.folderId}/list?archived=false`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Get folderless lists for a space
    if (action === "getFolderlessLists") {
      const res = await fetch(`${CLICKUP_API}/space/${params.spaceId}/list?archived=false`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Get tasks for a list
    if (action === "getTasks") {
      const res = await fetch(`${CLICKUP_API}/list/${params.listId}/task?archived=false&include_closed=false&order_by=due_date&reverse=true&subtasks=false`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Get all tasks assigned to me (across workspace)
    if (action === "getMyTasks") {
      const res = await fetch(`${CLICKUP_API}/team/${params.teamId}/task?assignees[]=${params.userId}&include_closed=false&order_by=due_date&reverse=true`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Create a task
    if (action === "createTask") {
      const res = await fetch(`${CLICKUP_API}/list/${params.listId}/task`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: params.name,
          description: params.description || "",
          status: params.status || null,
          priority: params.priority || null,
          due_date: params.dueDate || null,
          tags: params.tags || [],
        }),
      });
      const data = await res.json();
      return Response.json(data);
    }

    // Update a task
    if (action === "updateTask") {
      const res = await fetch(`${CLICKUP_API}/task/${params.taskId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(params.updates),
      });
      const data = await res.json();
      return Response.json(data);
    }

    // Add comment to task
    if (action === "addComment") {
      const res = await fetch(`${CLICKUP_API}/task/${params.taskId}/comment`, {
        method: "POST",
        headers,
        body: JSON.stringify({ comment_text: params.comment }),
      });
      const data = await res.json();
      return Response.json(data);
    }

    // Get authorized user info
    if (action === "getUser") {
      const res = await fetch(`${CLICKUP_API}/user`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    // Get dashboards for a team
    if (action === "getDashboards") {
      const res = await fetch(`${CLICKUP_API}/team/${params.teamId}/dashboard`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});