
const EXPERT_BASE_URL = "http://127.0.0.1:8000/expert";
const FORUM_BASE_URL = "http://127.0.0.1:8000/consultant-forum";

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const getExpertPortfolio = (userId) => requestJson(`${EXPERT_BASE_URL}/portfolio/${userId || "demo"}`);

export const saveExpertPortfolio = (userId, portfolio) => requestJson(`${EXPERT_BASE_URL}/portfolio/${userId || "demo"}`, {
  method: "POST",
  body: JSON.stringify(portfolio),
});

export const getExpertQuestions = (userId) => requestJson(`${EXPERT_BASE_URL}/questions/${userId || "demo"}`);

export const getExpertQuestionDetail = (questionId) => requestJson(`${EXPERT_BASE_URL}/questions/detail/${questionId}`);

export const replyExpertQuestion = (questionId, replyText) => requestJson(`${EXPERT_BASE_URL}/questions/${questionId}/reply`, {
  method: "POST",
  body: JSON.stringify({ reply_text: replyText }),
});

export const deleteExpertQuestionReply = (questionId) => requestJson(`${EXPERT_BASE_URL}/questions/${questionId}/reply`, {
  method: "DELETE",
});

export const getForumPosts = (userId) => {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return requestJson(`${FORUM_BASE_URL}/posts${query}`);
};

export const getForumPost = (postId, userId) => {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return requestJson(`${FORUM_BASE_URL}/posts/${postId}${query}`);
};

export const createForumPost = (payload) => requestJson(`${FORUM_BASE_URL}/posts`, {
  method: "POST",
  body: JSON.stringify(payload),
});

export const replyForumPost = (postId, payload) => requestJson(`${FORUM_BASE_URL}/posts/${postId}/reply`, {
  method: "POST",
  body: JSON.stringify(payload),
});

export const toggleForumLike = (postId, userId) => requestJson(`${FORUM_BASE_URL}/posts/${postId}/like`, {
  method: "POST",
  body: JSON.stringify({ user_id: userId }),
});

export const toggleForumSave = (postId, userId) => requestJson(`${FORUM_BASE_URL}/posts/${postId}/save`, {
  method: "POST",
  body: JSON.stringify({ user_id: userId }),
});

export const deleteForumPost = (postId, userId) => requestJson(`${FORUM_BASE_URL}/posts/${postId}`, {
  method: "DELETE",
  body: JSON.stringify({ user_id: userId || "" }),
});


export const updateForumReply = (postId, replyId, userId, content) => requestJson(`${FORUM_BASE_URL}/posts/${postId}/replies/${replyId}`, {
  method: "PUT",
  body: JSON.stringify({ user_id: userId || "", content }),
});

export const deleteForumReply = (postId, replyId, userId) => requestJson(`${FORUM_BASE_URL}/posts/${postId}/replies/${replyId}`, {
  method: "DELETE",
  body: JSON.stringify({ user_id: userId || "" }),
});
