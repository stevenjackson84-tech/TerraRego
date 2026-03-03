import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Pin, Trash2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function DealComments({ dealId, currentUserEmail }) {
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", dealId],
    queryFn: () => base44.entities.Comment.filter({ entity_type: "deal", entity_id: dealId }),
    enabled: !!dealId
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Comment.subscribe((event) => {
      if (event.data?.entity_id === dealId) {
        queryClient.invalidateQueries({ queryKey: ["comments", dealId] });
      }
    });
    return unsubscribe;
  }, [dealId, queryClient]);

  const createCommentMutation = useMutation({
    mutationFn: (content) =>
      base44.entities.Comment.create({
        entity_type: "deal",
        entity_id: dealId,
        content,
        mentions: []
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", dealId] });
      setNewComment("");
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", dealId] })
  });

  const pinCommentMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.Comment.update(id, { is_pinned: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", dealId] })
  });

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    setPosting(true);
    createCommentMutation.mutate(newComment);
    setPosting(false);
  };

  const pinnedComments = comments.filter(c => c.is_pinned);
  const regularComments = comments.filter(c => !c.is_pinned);

  const getInitials = (email) => {
    return email.split("@")[0].substring(0, 2).toUpperCase();
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handlePostComment}
            disabled={posting || !newComment.trim()}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </Button>
        </div>

        {/* Pinned Comments */}
        {pinnedComments.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Pinned</p>
            {pinnedComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserEmail={currentUserEmail}
                onDelete={() => deleteCommentMutation.mutate(comment.id)}
                getInitials={getInitials}
                isPinned={true}
              />
            ))}
          </div>
        )}

        {/* Regular Comments */}
        {regularComments.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            {regularComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserEmail={currentUserEmail}
                onDelete={() => deleteCommentMutation.mutate(comment.id)}
                onPin={() => pinCommentMutation.mutate(comment.id)}
                getInitials={getInitials}
              />
            ))}
          </div>
        )}

        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommentCard({ comment, currentUserEmail, onDelete, onPin, getInitials, isPinned }) {
  const isOwner = comment.created_by === currentUserEmail;

  return (
    <div className={cn(
      "border rounded-lg p-3",
      isPinned ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
    )}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-slate-300">
            {getInitials(comment.created_by)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {comment.created_by.split("@")[0]}
              </p>
              <p className="text-xs text-slate-500">
                {format(new Date(comment.created_date), "MMM d, yyyy h:mm a")}
              </p>
            </div>
            {isPinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" /> Pinned
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-700 mt-2">{comment.content}</p>
          <div className="flex gap-2 mt-2">
            {!isPinned && onPin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPin}
                className="h-6 text-xs text-slate-500 hover:text-slate-700"
              >
                <Pin className="h-3 w-3 mr-1" /> Pin
              </Button>
            )}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-6 text-xs text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}