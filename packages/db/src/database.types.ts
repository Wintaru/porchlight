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
          oauth_client_id: string | null
          owner_id: string
          revoked_at: string | null
          scopes: Database["public"]["Enums"]["agent_scope"][]
          token_hash: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          oauth_client_id?: string | null
          owner_id: string
          revoked_at?: string | null
          scopes: Database["public"]["Enums"]["agent_scope"][]
          token_hash?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          oauth_client_id?: string | null
          owner_id?: string
          revoked_at?: string | null
          scopes?: Database["public"]["Enums"]["agent_scope"][]
          token_hash?: string | null
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
      email_preferences: {
        Row: {
          digest: Database["public"]["Enums"]["digest_schedule"]
          digest_cursor: string
          profile_id: string
          queue_cursor: string
          queue_immediate: boolean
          unsubscribe_token: string
          updated_at: string
        }
        Insert: {
          digest?: Database["public"]["Enums"]["digest_schedule"]
          digest_cursor?: string
          profile_id: string
          queue_cursor?: string
          queue_immediate?: boolean
          unsubscribe_token?: string
          updated_at?: string
        }
        Update: {
          digest?: Database["public"]["Enums"]["digest_schedule"]
          digest_cursor?: string
          profile_id?: string
          queue_cursor?: string
          queue_immediate?: boolean
          unsubscribe_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          author_id: string | null
          created_at: string
          follower_id: string
          id: string
          tag_id: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          follower_id: string
          id?: string
          tag_id?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          follower_id?: string
          id?: string
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          revoked_at: string | null
          token_hash: string
          trust_level: Database["public"]["Enums"]["trust_level"]
          used_count: number
          invite_is_live: boolean | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          token_hash: string
          trust_level?: Database["public"]["Enums"]["trust_level"]
          used_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          token_hash?: string
          trust_level?: Database["public"]["Enums"]["trust_level"]
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          post_id: string | null
          published_path: string | null
          rejected_at: string | null
          retain_until: string | null
          scan_status: Database["public"]["Enums"]["scan_status"]
          sha256: string
          storage_path: string
          updated_at: string
          used_in_post: boolean
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
          post_id?: string | null
          published_path?: string | null
          rejected_at?: string | null
          retain_until?: string | null
          scan_status?: Database["public"]["Enums"]["scan_status"]
          sha256: string
          storage_path: string
          updated_at?: string
          used_in_post?: boolean
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
          post_id?: string | null
          published_path?: string | null
          rejected_at?: string | null
          retain_until?: string | null
          scan_status?: Database["public"]["Enums"]["scan_status"]
          sha256?: string
          storage_path?: string
          updated_at?: string
          used_in_post?: boolean
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
          {
            foreignKeyName: "media_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_blocks: {
        Row: {
          created_at: string
          level: Database["public"]["Enums"]["member_block_level"]
          member_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          level: Database["public"]["Enums"]["member_block_level"]
          member_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          level?: Database["public"]["Enums"]["member_block_level"]
          member_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_blocks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_blocks_target_id_fkey"
            columns: ["target_id"]
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
      post_revisions: {
        Row: {
          body_md: string
          id: string
          post_id: string
          replaced_at: string
          saved_at: string
          summary: string | null
          title: string
        }
        Insert: {
          body_md: string
          id?: string
          post_id: string
          replaced_at?: string
          saved_at: string
          summary?: string | null
          title: string
        }
        Update: {
          body_md?: string
          id?: string
          post_id?: string
          replaced_at?: string
          saved_at?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
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
          agent_draft_md: string | null
          agent_token_id: string | null
          announced_at: string | null
          anonymous_author_id: string | null
          author_id: string | null
          body_html: string
          body_md: string
          comments_enabled: boolean
          cover_focus_x: number
          cover_focus_y: number
          cover_media_id: string | null
          cover_zoom: number
          created_at: string
          excerpt: string | null
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
          version: number
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          agent_draft_md?: string | null
          agent_token_id?: string | null
          announced_at?: string | null
          anonymous_author_id?: string | null
          author_id?: string | null
          body_html?: string
          body_md?: string
          comments_enabled?: boolean
          cover_focus_x?: number
          cover_focus_y?: number
          cover_media_id?: string | null
          cover_zoom?: number
          created_at?: string
          excerpt?: string | null
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
          version?: number
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          agent_draft_md?: string | null
          agent_token_id?: string | null
          announced_at?: string | null
          anonymous_author_id?: string | null
          author_id?: string | null
          body_html?: string
          body_md?: string
          comments_enabled?: boolean
          cover_focus_x?: number
          cover_focus_y?: number
          cover_media_id?: string | null
          cover_zoom?: number
          created_at?: string
          excerpt?: string | null
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
          version?: number
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
          show_presence: boolean
          status: Database["public"]["Enums"]["profile_status"]
          trust_level: Database["public"]["Enums"]["trust_level"]
          updated_at: string
          voice_guide_md: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          show_presence?: boolean
          status?: Database["public"]["Enums"]["profile_status"]
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
          voice_guide_md?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          show_presence?: boolean
          status?: Database["public"]["Enums"]["profile_status"]
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
          voice_guide_md?: string | null
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
          reporter_anonymous_author_id: string | null
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
          reporter_anonymous_author_id?: string | null
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
          reporter_anonymous_author_id?: string | null
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
            foreignKeyName: "reports_reporter_anonymous_author_id_fkey"
            columns: ["reporter_anonymous_author_id"]
            isOneToOne: false
            referencedRelation: "anonymous_authors"
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
      subscribers: {
        Row: {
          author_id: string | null
          confirm_sent_at: string | null
          confirm_token: string | null
          confirmed_at: string | null
          created_at: string
          cursor: string
          digest: Database["public"]["Enums"]["digest_schedule"]
          email: string
          id: string
          unsubscribe_token: string
        }
        Insert: {
          author_id?: string | null
          confirm_sent_at?: string | null
          confirm_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          cursor?: string
          digest?: Database["public"]["Enums"]["digest_schedule"]
          email: string
          id?: string
          unsubscribe_token?: string
        }
        Update: {
          author_id?: string | null
          confirm_sent_at?: string | null
          confirm_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          cursor?: string
          digest?: Database["public"]["Enums"]["digest_schedule"]
          email?: string
          id?: string
          unsubscribe_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_author_id_fkey"
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
          description_md: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description_md?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description_md?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      voice_guide_revisions: {
        Row: {
          guide_md: string
          id: string
          profile_id: string
          replaced_at: string
        }
        Insert: {
          guide_md: string
          id?: string
          profile_id: string
          replaced_at?: string
        }
        Update: {
          guide_md?: string
          id?: string
          profile_id?: string
          replaced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_guide_revisions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      announce_post: {
        Args: { p_at: string; p_post_id: string }
        Returns: number
      }
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
      check_invite: { Args: { p_token_hash: string }; Returns: boolean }
      claim_anonymous_author: {
        Args: { p_anonymous_author_id: string; p_profile_id: string }
        Returns: string
      }
      claim_member_emails: {
        Args: { p_limit: number; p_until: string }
        Returns: {
          counts: Json
          email: string
          kind: string
          profile_id: string
          unsubscribe_token: string
          window_end: string
          window_start: string
        }[]
      }
      claim_subscriber_emails: {
        Args: { p_limit: number; p_until: string }
        Returns: {
          author_id: string
          email: string
          subscriber_id: string
          unsubscribe_token: string
          window_end: string
          window_start: string
        }[]
      }
      comment_search_document: { Args: { p_body_md: string }; Returns: unknown }
      confirm_subscription: { Args: { p_token: string }; Returns: boolean }
      digest_interval: {
        Args: { p_schedule: Database["public"]["Enums"]["digest_schedule"] }
        Returns: string
      }
      erase_account: { Args: { p_profile_id: string }; Returns: string }
      finalize_media_scan: {
        Args: {
          p_agent_token_id?: string
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
          post_id: string | null
          published_path: string | null
          rejected_at: string | null
          retain_until: string | null
          scan_status: Database["public"]["Enums"]["scan_status"]
          sha256: string
          storage_path: string
          updated_at: string
          used_in_post: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "media_assets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      following_post_ids: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          published_at: string
        }[]
      }
      invite_is_live: {
        Args: { "": Database["public"]["Tables"]["invites"]["Row"] }
        Returns: {
          error: true
        } & "the function public.invite_is_live with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache"
      }
      is_staff_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      link_post_media: { Args: { p_post_id: string }; Returns: undefined }
      listed_post_ids: {
        Args: { p_limit?: number; p_tag_id?: string }
        Returns: {
          id: string
          published_at: string
        }[]
      }
      markdown_plain_text: { Args: { p_body_md: string }; Returns: string }
      media_in_use: { Args: { p_media_id: string }; Returns: boolean }
      member_email_of: { Args: { p_profile_id: string }; Returns: string }
      null_expired_raw_ips: { Args: never; Returns: number }
      post_excerpt: { Args: { p_body_md: string }; Returns: string }
      post_is_private: { Args: { p_post_id: string }; Returns: boolean }
      post_reaction_counts: {
        Args: { p_post_id: string; p_viewer_id?: string }
        Returns: {
          comment_id: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          mine: boolean
          total: number
        }[]
      }
      post_search_document: {
        Args: { p_body_md: string; p_summary: string; p_title: string }
        Returns: unknown
      }
      post_uses_media: {
        Args: {
          p_body_md: string
          p_cover_media_id: string
          p_media_id: string
        }
        Returns: boolean
      }
      presence_allowed: { Args: never; Returns: boolean }
      public_tags: {
        Args: never
        Returns: {
          created_at: string
          description_md: string | null
          id: string
          name: string
          slug: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tags"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      published_author_count: { Args: never; Returns: number }
      redeem_invite: {
        Args: { p_token_hash: string }
        Returns: Database["public"]["Enums"]["trust_level"]
      }
      release_invite: { Args: { p_token_hash: string }; Returns: undefined }
      release_member_email: {
        Args: {
          p_kind: string
          p_profile_id: string
          p_window_end: string
          p_window_start: string
        }
        Returns: undefined
      }
      release_member_emails: { Args: { p_claims: Json }; Returns: number }
      release_subscriber_email: {
        Args: {
          p_subscriber_id: string
          p_window_end: string
          p_window_start: string
        }
        Returns: undefined
      }
      release_subscriber_emails: { Args: { p_claims: Json }; Returns: number }
      release_subscription_confirmation: {
        Args: { p_confirm_token: string }
        Returns: boolean
      }
      replace_oauth_grant: {
        Args: {
          p_client_id: string
          p_name: string
          p_owner_id: string
          p_scopes: Database["public"]["Enums"]["agent_scope"][]
        }
        Returns: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          oauth_client_id: string | null
          owner_id: string
          revoked_at: string | null
          scopes: Database["public"]["Enums"]["agent_scope"][]
          token_hash: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_tokens"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      replace_post_tags: {
        Args: { p_post_id: string; p_tags: Json }
        Returns: undefined
      }
      request_subscription: {
        Args: {
          p_author_id?: string
          p_confirm_token: string
          p_digest: Database["public"]["Enums"]["digest_schedule"]
          p_email: string
        }
        Returns: string
      }
      search_candidates: {
        Args: { p_query: string }
        Returns: {
          comment_id: string
          post_id: string
        }[]
      }
      search_query: { Args: { p_query: string }; Returns: unknown }
      search_site: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          author_handle: string
          comment_id: string
          kind: string
          post_id: string
          published_at: string
          rank: number
          slug: string
          snippet: string
          title: string
        }[]
      }
      set_email_preferences: {
        Args: {
          p_digest: Database["public"]["Enums"]["digest_schedule"]
          p_profile_id: string
          p_queue_immediate: boolean
        }
        Returns: undefined
      }
      several_published_authors: { Args: never; Returns: boolean }
      sweep_rate_limits: { Args: never; Returns: number }
      unused_media: {
        Args: { p_media_ids: string[]; p_owner_id: string; p_post_id?: string }
        Returns: string[]
      }
      viewer_hidden_author_ids: { Args: never; Returns: string[] }
      viewer_hidden_authors: { Args: never; Returns: string[] }
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
      digest_schedule: "off" | "hourly" | "daily"
      media_kind: "image" | "document" | "model" | "track" | "video"
      member_block_level: "mute" | "block"
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
        | "post.published"
      post_origin: "editor" | "agent"
      post_status:
        | "draft"
        | "pending"
        | "published"
        | "rejected"
        | "hidden"
        | "removed"
      post_visibility: "public" | "unlisted" | "private"
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
      digest_schedule: ["off", "hourly", "daily"],
      media_kind: ["image", "document", "model", "track", "video"],
      member_block_level: ["mute", "block"],
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
        "post.published",
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
      post_visibility: ["public", "unlisted", "private"],
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

