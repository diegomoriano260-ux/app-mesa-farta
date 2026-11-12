import { AutomationForm } from "../form";
import { loadChannels, loadPosts } from "../data";

export default async function NovaAutomacao() {
  const channels = await loadChannels();
  const posts = await loadPosts(channels);
  return (
    <div className="pb-20 md:pb-0">
      <h1 className="mb-6 text-[26px] font-bold tracking-tight">Nova automação</h1>
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
