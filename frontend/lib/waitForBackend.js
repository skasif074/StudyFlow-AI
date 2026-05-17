const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function waitForBackend() {
  let connected = false;

  while (!connected) {
    try {
      const res = await fetch(`${API_URL}/health`);

      if (res.ok) {
        connected = true;
        return true;
      }
    } catch (err) {
      console.log("Backend sleeping...");
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
