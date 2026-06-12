import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { updateProfile, changePassword } from '@/services/authService'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const { theme, setTheme } = useThemeStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const { register, handleSubmit } = useForm({
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  })

  const onSaveProfile = async (data: { name: string; email: string }) => {
    setSavingProfile(true)
    try {
      const updated = await updateProfile(data.name)
      updateUser(updated)
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both password fields')
      return
    }
    setSavingPassword(true)
    try {
      const res = await changePassword(currentPassword, newPassword)
      toast.success(res.message)
      setCurrentPassword('')
      setNewPassword('')
    } catch (e) {
      const message = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(message || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <Avatar className="h-16 w-16"><AvatarFallback className="text-xl">{user?.name?.charAt(0)}</AvatarFallback></Avatar>
            </div>
            <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
              <div><Label>Name</Label><Input className="mt-1.5" {...register('name')} /></div>
              <div><Label>Email</Label><Input className="mt-1.5" type="email" disabled {...register('email')} /></div>
              <Button type="submit" disabled={savingProfile}>Save Profile</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Security</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input type="password" className="mt-1.5" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" className="mt-1.5" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <Button onClick={onChangePassword} disabled={savingPassword}>Change Password</Button>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div><p className="font-medium">Two-Factor Authentication</p><p className="text-sm text-muted">Add an extra layer of security</p></div>
              <Switch onCheckedChange={() => toast.info('2FA setup coming soon')} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><span>Email Notifications</span><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><span>SMS Notifications</span><Switch /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <button type="button" onClick={() => setTheme('light')} className={`w-full rounded-lg border p-4 text-left ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <p className="font-medium">Light Mode</p>
              <p className="text-sm text-muted">Clean and bright interface</p>
            </button>
            <button type="button" onClick={() => setTheme('dark')} className={`w-full rounded-lg border p-4 text-left ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted">Easy on the eyes</p>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
