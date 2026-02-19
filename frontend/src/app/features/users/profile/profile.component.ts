import { Component, signal, inject, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../../environments/environment'

export interface ProfileUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: string
  emailVerifiedAt: string | null
  userType: string | null
  incomeSources: unknown
  onboardingCompleted: boolean
}

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly http = inject(HttpClient)

  protected readonly user = signal<ProfileUser | null>(null)
  protected readonly uploading = signal(false)
  protected readonly uploadError = signal<string | null>(null)

  protected get initials(): string {
    const u = this.user()
    if (!u?.name?.trim()) return '?'
    const parts = u.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return (parts[0][0] ?? '?').toUpperCase()
  }

  ngOnInit(): void {
    this.loadProfile()
  }

  loadProfile(): void {
    const apiUrl = (environment as { apiUrl?: string }).apiUrl
    if (!apiUrl) {
      this.user.set(null)
      return
    }
    this.http
      .get<{ success: boolean; data: ProfileUser }>(`${apiUrl}/auth/me`)
      .subscribe({
        next: (res) => (res.success && res.data ? this.user.set(res.data) : this.user.set(null)),
        error: () => this.user.set(null),
      })
  }

  onFileSelected(event: Event): void {
    this.uploadError.set(null)
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Please choose an image file.')
      return
    }
    const apiUrl = (environment as { apiUrl?: string }).apiUrl
    if (!apiUrl) {
      this.uploadError.set('API not configured.')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    this.uploading.set(true)
    this.http
      .post<{ success: boolean; data?: { avatarUrl: string } }>(
        `${apiUrl}/users/me/profile-picture`,
        formData
      )
      .subscribe({
        next: (res) => {
          this.uploading.set(false)
          if (res.success && res.data?.avatarUrl) {
            this.user.update((u) => (u ? { ...u, avatarUrl: res.data!.avatarUrl } : null))
          }
          input.value = ''
        },
        error: (err) => {
          this.uploading.set(false)
          const msg = err.error?.message ?? err.message ?? 'Upload failed.'
          this.uploadError.set(msg)
          input.value = ''
        },
      })
  }
}
