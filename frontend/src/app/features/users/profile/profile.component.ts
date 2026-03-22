import { Component, signal, inject, OnInit } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import {
  lucideUser,
  lucideShield,
  lucideSettings,
  lucideHelpCircle,
  lucideLogOut,
  lucideCamera,
  lucideCheck,
  lucideMail,
  lucideCalendar,
  lucideTag,
  lucideBadgeCheck,
  lucideAlertCircle,
  lucideChevronRight,
  lucidePencil,
  lucideX,
  lucideEye,
  lucideEyeOff,
  lucideLock,
  lucideKeyRound,
} from '@ng-icons/lucide'
import { environment } from '../../../../environments/environment'
import { AuthService } from '../../../core/auth/auth.service'
import { ThemeService } from '../../../core/theme.service'
import { CurrencyService, CURRENCIES } from '../../../core/services/currency.service'
import { Router } from '@angular/router'

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
  createdAt?: string | null
}

type ProfileSection = 'profile' | 'security' | 'preferences'

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIconComponent, FormsModule],
  providers: [
    provideIcons({
      lucideUser,
      lucideShield,
      lucideSettings,
      lucideHelpCircle,
      lucideLogOut,
      lucideCamera,
      lucideCheck,
      lucideMail,
      lucideCalendar,
      lucideTag,
      lucideBadgeCheck,
      lucideAlertCircle,
      lucideChevronRight,
      lucidePencil,
      lucideX,
      lucideEye,
      lucideEyeOff,
      lucideLock,
      lucideKeyRound,
    }),
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private readonly http = inject(HttpClient)
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)
  protected readonly themeService = inject(ThemeService)
  protected readonly currencyService = inject(CurrencyService)

  protected readonly user = signal<ProfileUser | null>(null)
  protected readonly uploading = signal(false)
  protected readonly uploadError = signal<string | null>(null)
  protected readonly uploadSuccess = signal(false)
  protected readonly activeSection = signal<ProfileSection>('profile')
  protected readonly previewUrl = signal<string | null>(null)
  protected readonly isDragging = signal(false)

  protected readonly editingName = signal(false)
  protected readonly editNameValue = signal('')
  protected readonly savingName = signal(false)
  protected readonly saveNameError = signal<string | null>(null)

  // Password change
  protected readonly pwCurrent = signal('')
  protected readonly pwNew = signal('')
  protected readonly pwConfirm = signal('')
  protected readonly pwSaving = signal(false)
  protected readonly pwError = signal<string | null>(null)
  protected readonly pwSuccess = signal(false)
  protected readonly pwShowCurrent = signal(false)
  protected readonly pwShowNew = signal(false)
  protected readonly pwShowConfirm = signal(false)

  // Preferences
  private static readonly NOTIF_BUDGET_KEY = 'finanalytics-notif-budget'
  private static readonly NOTIF_GOAL_KEY = 'finanalytics-notif-goal'
  private static readonly NOTIF_INSIGHTS_KEY = 'finanalytics-notif-insights'

  protected readonly notifBudget = signal<boolean>(
    (localStorage.getItem(ProfileComponent.NOTIF_BUDGET_KEY) ?? 'true') === 'true'
  )
  protected readonly notifGoal = signal<boolean>(
    (localStorage.getItem(ProfileComponent.NOTIF_GOAL_KEY) ?? 'true') === 'true'
  )
  protected readonly notifInsights = signal<boolean>(
    (localStorage.getItem(ProfileComponent.NOTIF_INSIGHTS_KEY) ?? 'true') === 'true'
  )

  protected readonly currencies = CURRENCIES

  protected readonly sections = [
    {
      group: 'Account',
      items: [
        { id: 'profile' as ProfileSection, label: 'Profile', icon: 'lucideUser' },
        { id: 'security' as ProfileSection, label: 'Security', icon: 'lucideShield' },
        { id: 'preferences' as ProfileSection, label: 'Preferences', icon: 'lucideSettings' },
      ],
    },
  ]

  protected get initials(): string {
    const u = this.user()
    if (!u?.name?.trim()) return u?.email?.[0]?.toUpperCase() ?? '?'
    const parts = u.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return (parts[0][0] ?? '?').toUpperCase()
  }

  protected get memberSince(): string {
    const createdAt = this.user()?.createdAt
    if (!createdAt) return '—'
    return new Date(createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  protected get isEmailVerified(): boolean {
    return !!this.user()?.emailVerifiedAt
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

  setSection(section: ProfileSection): void {
    this.activeSection.set(section)
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    this.uploadFile(file, input)
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging.set(true)
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault()
    this.isDragging.set(false)
  }

  onDrop(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging.set(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) this.uploadFile(file, null)
  }

  private uploadFile(file: File, input: HTMLInputElement | null): void {
    this.uploadError.set(null)
    this.uploadSuccess.set(false)
    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Image must be under 5 MB.')
      return
    }
    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string)
    reader.readAsDataURL(file)

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
          this.previewUrl.set(null)
          if (res.success && res.data?.avatarUrl) {
            this.user.update((u) => (u ? { ...u, avatarUrl: res.data!.avatarUrl } : null))
            this.auth.patchCurrentUser({ avatarUrl: res.data!.avatarUrl })
            this.uploadSuccess.set(true)
            setTimeout(() => this.uploadSuccess.set(false), 3000)
          }
          if (input) input.value = ''
        },
        error: (err) => {
          this.uploading.set(false)
          this.previewUrl.set(null)
          const msg = err.error?.message ?? err.message ?? 'Upload failed.'
          this.uploadError.set(msg)
          if (input) input.value = ''
        },
      })
  }

  startEditName(): void {
    this.editNameValue.set(this.user()?.name ?? '')
    this.saveNameError.set(null)
    this.editingName.set(true)
  }

  cancelEditName(): void {
    this.editingName.set(false)
    this.saveNameError.set(null)
  }

  saveEditName(): void {
    const name = this.editNameValue().trim()
    if (!name) {
      this.saveNameError.set('Name cannot be empty.')
      return
    }
    const apiUrl = (environment as { apiUrl?: string }).apiUrl
    if (!apiUrl) return
    this.savingName.set(true)
    this.saveNameError.set(null)
    this.http
      .patch<{ success: boolean; data?: ProfileUser }>(`${apiUrl}/users/me`, { name })
      .subscribe({
        next: (res) => {
          this.savingName.set(false)
          if (res.success && res.data) {
            this.user.set(res.data)
            this.auth.patchCurrentUser({ name: res.data.name ?? name })
          } else {
            this.user.update((u) => (u ? { ...u, name } : null))
            this.auth.patchCurrentUser({ name })
          }
          this.editingName.set(false)
        },
        error: (err) => {
          this.savingName.set(false)
          this.saveNameError.set(err.error?.message ?? 'Failed to save name.')
        },
      })
  }

  submitChangePassword(): void {
    this.pwError.set(null)
    this.pwSuccess.set(false)

    const current = this.pwCurrent().trim()
    const newPw = this.pwNew().trim()
    const confirm = this.pwConfirm().trim()

    if (!current) { this.pwError.set('Current password is required.'); return }
    if (newPw.length < 8) { this.pwError.set('New password must be at least 8 characters.'); return }
    if (newPw !== confirm) { this.pwError.set('Passwords do not match.'); return }

    const apiUrl = (environment as { apiUrl?: string }).apiUrl
    if (!apiUrl) { this.pwError.set('API not configured.'); return }

    this.pwSaving.set(true)
    this.http
      .patch<{ success: boolean; message: string }>(
        `${apiUrl}/users/me/change-password`,
        { currentPassword: current, newPassword: newPw }
      )
      .subscribe({
        next: () => {
          this.pwSaving.set(false)
          this.pwSuccess.set(true)
          this.pwCurrent.set('')
          this.pwNew.set('')
          this.pwConfirm.set('')
          setTimeout(() => this.pwSuccess.set(false), 5000)
        },
        error: (err) => {
          this.pwSaving.set(false)
          this.pwError.set(err.error?.message ?? 'Failed to change password.')
        },
      })
  }

  setCurrency(code: string): void {
    this.currencyService.setCurrency(code)
  }

  toggleNotif(key: 'budget' | 'goal' | 'insights'): void {
    if (key === 'budget') {
      const val = !this.notifBudget()
      this.notifBudget.set(val)
      localStorage.setItem(ProfileComponent.NOTIF_BUDGET_KEY, String(val))
    } else if (key === 'goal') {
      const val = !this.notifGoal()
      this.notifGoal.set(val)
      localStorage.setItem(ProfileComponent.NOTIF_GOAL_KEY, String(val))
    } else {
      const val = !this.notifInsights()
      this.notifInsights.set(val)
      localStorage.setItem(ProfileComponent.NOTIF_INSIGHTS_KEY, String(val))
    }
  }

  logout(): void {
    this.auth.logout()
    this.router.navigate(['/auth/login'])
  }
}
