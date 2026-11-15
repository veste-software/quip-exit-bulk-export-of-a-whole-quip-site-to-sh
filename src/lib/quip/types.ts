export type ThreadType = 'document' | 'spreadsheet' | 'slides' | 'chat';

export interface QuipUser {
  id: string;
  name: string;
  private_folder_id: string;
  shared_folder_ids: string[];
  starred_folder_id?: string;
}

export interface QuipFolderChild {
  thread_id?: string;
  folder_id?: string;
}

export interface QuipFolderRecord {
  folder: { id: string; title: string };
  children: QuipFolderChild[];
}

export interface QuipThreadRecord {
  thread: {
    id: string;
    title: string;
    type: ThreadType;
    link: string;
    updated_usec: number;
    author_id: string;
    owner_name?: string;
  };
  html: string;
}

export interface QuipMessage {
  id: string;
  author_id: string;
  author_name: string;
  created_usec: number;
  text: string;
}

export interface MessagePage {
  messages: QuipMessage[];
  next_cursor?: string;
}
