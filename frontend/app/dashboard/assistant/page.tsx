const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    // 1. Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true); 

    await saveMessage("user", messageText);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a helpful academic assistant for students. Help them understand concepts, summarize notes, create quiz questions, make flashcards, and answer academic questions. Be clear, concise and educational.",
            },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: messageText },
          ],
          max_tokens: 1000,
          stream: true, 
        }),
      });

      if (!response.body) throw new Error("No response body");

      // 2. Create an empty assistant message placeholder in the UI
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);
      
      setLoading(false);

      // 3. Read the stream chunk by chunk
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        
        for (const line of lines) {
          if (line === "data: [DONE]") break;
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));
              const token = data.choices[0]?.delta?.content || "";
              
              if (token) {
                fullContent += token;
                // Update the specific message with the newly appended word
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e);
            }
          }
        }
      }


      await saveMessage("assistant", fullContent);
      fetchSessions();
      
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error connecting to the neural network. Please try again.",
        },
      ]);
      setLoading(false);
    }
  };
