export type NoteEditorSyncDecision = {
  draft: string;
  editing: boolean;
};

export type NoteEditorSyncInput = {
  previousNodeId: string;
  currentNodeId: string;
  currentNote: string;
  isEditing: boolean;
};

export function getNoteEditorSyncDecision({
  previousNodeId,
  currentNodeId,
  currentNote,
  isEditing,
}: NoteEditorSyncInput): NoteEditorSyncDecision | null {
  if (previousNodeId !== currentNodeId) {
    return {
      draft: currentNote,
      editing: false,
    };
  }

  if (!isEditing) {
    return {
      draft: currentNote,
      editing: false,
    };
  }

  return null;
}
