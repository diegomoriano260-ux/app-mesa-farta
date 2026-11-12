import { AutomationForm } from "../form";
import { loadChannels, loadPosts } from "../data";

export default async function NovaAutomacao() {
  const channels = await loadChannels();
  const posts = await loadPosts(channels);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nova automação</h1>
      <AutomationForm
        channels={channels}
        posts={posts}
        initial={{
          name: "", channel_id: "", trigger: "ig_comment", post_id: null, keywords: [], match_mode: "contains",
          public_reply: null, tag_to_add: null, priority: 0, is_active: true, messages: [],
        }}
      />
    </div>
  );
}
