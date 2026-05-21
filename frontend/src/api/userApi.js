export const createAccount = async (formData) => {

  const response = await fetch(
    "http://127.0.0.1:8000/user/create-account",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    }
  );

  return await response.json();
};

export const loginAccount = async (formData) => {

  const response = await fetch(
    "http://127.0.0.1:8000/user/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    }
  );

  return await response.json();
};
