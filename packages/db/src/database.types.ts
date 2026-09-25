export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          owner_id: string
          revoked_at: string | null
          scopes: Database["public"]["Enums"]["agent_scope"][]
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          owner_id: string
          revoked_at?: string | null
          scopes: Database["public"]["Enums"]["agent_scope"][]
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          owner_id?: string
          revoked_at?: string | null
          scopes?: Database["public"]["Enums"]["agent_scope"][]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tokens_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_authors: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          ip_hash: string | null
          last_seen_at: string
          secret_hash: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          secret_hash: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          secret_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_authors_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event: string
          id: number
          subject_id: string | null
          subject_kind: Database["public"]["Enums"]["subject_kind"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event: string
          id?: never
          subject_id?: string | null
          subject_kind?: Database["public"]["Enums"]["subject_kind"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event?: string
          id?: never
          subject_id?: string | null
          subject_kind?: Database["public"]["Enums"]["subject_kind"] | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          anonymous_author_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          ip_hash: string | null
          reason: string | null
        }
        Insert: {
          anonymous_author_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          ip_hash?: string | null
          reason?: string | null
        }
        Update: {
          anonymous_author_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          ip_hash?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_anonymous_author_id_fkey"
            columns: ["anonymous_author_id"]
            isOneToOne: false
            referencedRelation: "anonymous_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          anonymous_author_id: string | null
          author_id: string | null
          body_html: string
          body_md: string
          created_at: string
          depth: number
          id: string
          parent_id: string | null
          post_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        Insert: {
          anonymous_author_id?: string | null
          author_id?: string | null
          body_html?: string
          body_md?: string
          created_at?: string
          depth?: number
          id?: string
          parent_id?: string | null
          post_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Update: {
          anonymous_author_id?: string | null
          author_id?: string | null
          body_html?: string
          body_md?: string
          created_at?: string
          depth?: number
          id?: string
          parent_id?: string | null
          post_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_anonymous_author_id_fkey"
            columns: ["anonymous_author_id"]
            isOneToOne: false
            referencedRelation: "anonymous_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          anonymous_author_id: string | null
          bytes: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          mature: boolean
          mime_type: string
          original_filename: string
          owner_id: string | null
          perceptual_hash: string | null
          published_path: string | null
          retain_until: string | null
          scan_status: Database["public"]["Enums"]["scan_status"]
          sha256: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          anonymous_author_id?: string | null
          bytes: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          mature?: boolean
          mime_type: string
          original_filename: string
          owner_id?: string | null
          perceptual_hash?: string | null
          published_path?: string | null
          retain_until?: string | null
          scan_status?: Database["public"]["Enums"]["scan_status"]
          sha256: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          anonymous_author_id?: string | null
          bytes?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mature?: boolean
          mime_type?: string
          original_filename?: string
          owner_id?: string | null
          perceptual_hash?: string | null
          published_path?: string | null
          retain_until?: string | null
          scan_status?: Database["public"]["Enums"]["scan_status"]
          sha256?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_anonymous_author_id_fkey"
            columns: ["anonymous_author_id"]
            isOneToOne: false
            referencedRelation: "anonymous_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mod_actions: {
        Row: {
          action: Database["public"]["Enums"]["mod_action_kind"]
          actor_id: string
          created_at: string
          id: string
          reason: string | null
          target_anonymous_author_id: string | null
          target_comment_id: string | null
          target_media_id: string | null
          target_post_id: string | null
          target_profile_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["mod_action_kind"]
          actor_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_anonymous_author_id?: string | null
          target_comment_id?: string | null
          target_media_id?: string | null
          target_post_id?: string | null
          target_profile_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["mod_action_kind"]
          actor_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_anonymous_author_id?: string | null
          target_comment_id?: string | null
          target_media_id?: string | null
          target_post_id?: string | null
          target_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mod_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mod_actions_target_anonymous_author_id_fkey"
            columns: ["target_anonymous_author_id"]
            isOneToOne: false
            referencedRelation: "anonymous_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mod_actions_target_comment_id_fkey"
            columns: ["target_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mod_actions_target_media_id_fkey"
            columns: ["target_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mod_actions_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mod_actions_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload: Json
          post_id: string | null
          read_at: string | null
          recipient_id: string
          report_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload?: Json
          post_id?: string | null
          read_at?: string | null
          recipient_id: string
          report_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          payload?: Json
          post_id?: string | null
          read_at?: string | null
          recipient_id?: string
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          agent_token_id: string | null
          anonymous_author_id: string | null
          author_id: string | null
          body_html: string
          body_md: string
          comments_enabled: boolean
          cover_media_id: string | null
          created_at: string
          id: string
          origin: Database["public"]["Enums"]["post_origin"]
          published_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          slug: string
          status: Database["public"]["Enums"]["post_status"]
          summary: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          agent_token_id?: string | null
          anonymous_author_id?: string | null
          author_id?: string | null
          body_html?: string
          body_md?: string
          comments_enabled?: boolean
          cover_media_id?: string | null
          created_at?: string
          id?: string
          origin?: Database["public"]["Enums"]["post_origin"]
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["post_status"]
          summary?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          agent_token_id?: string | null
          anonymous_author_id?: string | null
          author_id?: string | null
          body_html?: string
          body_md?: string
          comments_enabled?: boolean
          cover_media_id?: string | null
          created_at?: string
          id?: string
          origin?: Database["public"]["Enums"]["post_origin"]
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["post_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_agent_token_id_fkey"
            columns: ["agent_token_id"]
            isOneToOne: false
            referencedRelation: "agent_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_anonymous_author_id_fkey"
            columns: ["anonymous_author_id"]
            isOneToOne: false
            referencedRelation: "anonymous_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          handle: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["profile_status"]
          trust_level: Database["public"]["Enums"]["trust_level"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
        }
        Relationships: []
      }
      quotas: {
        Row: {
          bytes_used: number
          files_count: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          bytes_used?: number
          files_count?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          bytes_used?: number
          files_count?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          subject: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          subject: string
          window_start: string
        }
        Update: {
          action?: string
          count?: number
          subject?: string
          window_start?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          post_id: string | null
          profile_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          post_id?: string | null
          profile_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["reaction_kind"]
          post_id?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          comment_id: string | null
          created_at: string
          details: string | null
          id: string
          post_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "site_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_evidence: {
        Row: {
          agent_token_id: string | null
          anonymous_author_id: string | null
          author_id: string | null
          frozen: boolean
          id: string
          ip_hash: string
          original_bytes: number | null
          original_filename: string | null
          perceptual_hash: string | null
          raw_ip_expires_at: string
          request_id: string
          retain_until: string | null
          sha256: string | null
          source_ip: unknown
          source_port: number | null
          subject_id: string
          subject_kind: Database["public"]["Enums"]["subject_kind"]
          submitted_at: string
          turnstile_result: Database["public"]["Enums"]["turnstile_result"]
          user_agent: string | null
        }
        Insert: {
          agent_token_id?: string | null
          anonymous_author_id?: string | null
          author_id?: string | null
          frozen?: boolean
          id?: string
          ip_hash: string
          original_bytes?: number | null
          original_filename?: string | null
          perceptual_hash?: string | null
          raw_ip_expires_at: string
          request_id: string
          retain_until?: string | null
          sha256?: string | null
          source_ip?: unknown
          source_port?: number | null
          subject_id: string
          subject_kind: Database["public"]["Enums"]["subject_kind"]
          submitted_at?: string
          turnstile_result: Database["public"]["Enums"]["turnstile_result"]
          user_agent?: string | null
        }
        Update: {
          agent_token_id?: string | null
          anonymous_author_id?: string | null
          author_id?: string | null
          frozen?: boolean
          id?: string
          ip_hash?: string
          original_bytes?: number | null
          original_filename?: string | null
          perceptual_hash?: string | null
          raw_ip_expires_at?: string
          request_id?: string
          retain_until?: string | null
          sha256?: string | null
          source_ip?: unknown
          source_port?: number | null
          subject_id?: string
          subject_kind?: Database["public"]["Enums"]["subject_kind"]
          submitted_at?: string
          turnstile_result?: Database["public"]["Enums"]["turnstile_result"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_evidence_agent_token_id_fkey"
            columns: ["agent_token_id"]
            isOneToOne: false
            referencedRelation: "agent_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_evidence_anonymous_author_id_fkey"
            columns: ["anonymous_author_id"]
            isOneToOne: false
            referencedRelation: "anonymous_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_evidence_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymous_status: {
        Args: { p_anonymous_author_id: string }
        Returns: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["subject_kind"]
          post_author_handle: string
          post_slug: string
          reply_count: number
          status: string
          title: string
        }[]
      }
      bump_rate_limit: {
        Args: { p_action: string; p_subject: string; p_window_start: string }
        Returns: number
      }
      claim_anonymous_author: {
        Args: { p_anonymous_author_id: string; p_profile_id: string }
        Returns: string
      }
      erase_account: { Args: { p_profile_id: string }; Returns: string }
      finalize_media_scan: {
        Args: {
          p_anonymous_author_id?: string
          p_audit_details?: Json
          p_audit_event?: string
          p_bytes: number
          p_frozen: boolean
          p_id: string
          p_ip_hash: string
          p_kind: Database["public"]["Enums"]["media_kind"]
          p_mime_type: string
          p_original_filename: string
          p_owner_id?: string
          p_perceptual_hash?: string
          p_raw_ip_expires_at: string
          p_request_id: string
          p_retain_until?: string
          p_scan_status: Database["public"]["Enums"]["scan_status"]
          p_sha256: string
          p_source_ip?: unknown
          p_source_port?: number
          p_storage_path: string
          p_turnstile_result: Database["public"]["Enums"]["turnstile_result"]
          p_user_agent?: string
        }
        Returns: {
          anonymous_author_id: string | null
          bytes: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          mature: boolean
          mime_type: string
          original_filename: string
          owner_id: string | null
          perceptual_hash: string | null
          published_path: string | null
          retain_until: string | null
          scan_status: Database["public"]["Enums"]["scan_status"]
          sha256: string
          storage_path: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "media_assets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      null_expired_raw_ips: { Args: never; Returns: number }
      replace_post_tags: {
        Args: { p_post_id: string; p_tags: Json }
        Returns: undefined
      }
    }
    Enums: {
      agent_scope:
        | "posts:draft"
        | "posts:publish"
        | "media:upload"
        | "voice:write"
      comment_status:
        | "pending"
        | "visible"
        | "rejected"
        | "hidden"
        | "removed"
        | "tombstone"
      media_kind: "image" | "document" | "model" | "track" | "video"
      mod_action_kind:
        | "approve"
        | "approve_mature"
        | "reject"
        | "hide"
        | "remove"
        | "lock_thread"
        | "suspend"
        | "ban"
        | "block_anonymous"
        | "escalate"
        | "mark_trusted"
        | "dismiss_reports"
      notification_kind:
        | "queue.pending"
        | "reply.created"
        | "item.approved"
        | "item.rejected"
        | "report.filed"
        | "mod.action"
      post_origin: "editor" | "agent"
      post_status:
        | "draft"
        | "pending"
        | "published"
        | "rejected"
        | "hidden"
        | "removed"
      post_visibility: "public" | "unlisted"
      profile_status: "active" | "suspended" | "banned" | "erased"
      reaction_kind: "heart" | "laugh" | "wow" | "sad" | "clap"
      region: "US" | "EU" | "UK" | "CA" | "AU" | "other"
      report_reason:
        | "harassment"
        | "hate"
        | "spam"
        | "sexual_content"
        | "violence"
        | "self_harm"
        | "copyright"
        | "other"
        | "illegal_content"
      report_status: "open" | "escalated" | "resolved" | "dismissed"
      scan_status: "pending" | "clear" | "flagged" | "locked"
      subject_kind: "post" | "comment" | "media"
      trust_level: "probation" | "trusted"
      turnstile_result: "pass" | "fail" | "not_required"
      user_role: "admin" | "moderator" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_scope: [
        "posts:draft",
        "posts:publish",
        "media:upload",
        "voice:write",
      ],
      comment_status: [
        "pending",
        "visible",
        "rejected",
        "hidden",
        "removed",
        "tombstone",
      ],
      media_kind: ["image", "document", "model", "track", "video"],
      mod_action_kind: [
        "approve",
        "approve_mature",
        "reject",
        "hide",
        "remove",
        "lock_thread",
        "suspend",
        "ban",
        "block_anonymous",
        "escalate",
        "mark_trusted",
        "dismiss_reports",
      ],
      notification_kind: [
        "queue.pending",
        "reply.created",
        "item.approved",
        "item.rejected",
        "report.filed",
        "mod.action",
      ],
      post_origin: ["editor", "agent"],
      post_status: [
        "draft",
        "pending",
        "published",
        "rejected",
        "hidden",
        "removed",
      ],
      post_visibility: ["public", "unlisted"],
      profile_status: ["active", "suspended", "banned", "erased"],
      reaction_kind: ["heart", "laugh", "wow", "sad", "clap"],
      region: ["US", "EU", "UK", "CA", "AU", "other"],
      report_reason: [
        "harassment",
        "hate",
        "spam",
        "sexual_content",
        "violence",
        "self_harm",
        "copyright",
        "other",
        "illegal_content",
      ],
      report_status: ["open", "escalated", "resolved", "dismissed"],
      scan_status: ["pending", "clear", "flagged", "locked"],
      subject_kind: ["post", "comment", "media"],
      trust_level: ["probation", "trusted"],
      turnstile_result: ["pass", "fail", "not_required"],
      user_role: ["admin", "moderator", "member"],
    },
  },
} as const

