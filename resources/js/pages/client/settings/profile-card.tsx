import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

// @ts-ignore
export const ProfileCard = ({ user, setUser, saveUser }) => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your basic profile information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {user && (
            <>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Username"
                />
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={user.full_name ?? ""}
                  onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                  placeholder="Full Name"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  placeholder="Email"
                />
              </div>

              <div className="space-y-2">
                <Label>Birthdate</Label>
                <Input
                  type="date"
                  value={user.birthdate ?? ""}
                  onChange={(e) => setUser({ ...user, birthdate: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={saveUser} disabled={!user}>
            Save Profile
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};