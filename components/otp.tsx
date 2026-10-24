
import { Html, Body, Text, Container, Heading } from '@react-email/components'

export default function Otp({ code }: { code: string }) {
  return (
    <Html lang="id">
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Arial, sans-serif', padding: '24px' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '8px', textAlign: 'center' }}>
          <Heading style={{ fontSize: '24px' }}>
            Verifikasi Email
          </Heading>

          <Text style={{ fontSize: '16px', color: '#52525b' }}>
            Gunakan kode OTP berikut untuk melanjutkan proses verifikasi.
          </Text>

          <Heading style={{
            fontSize: '32px',
            letterSpacing: '8px',
            color: '#18181b',
            margin: '24px 0',
          }}>
            {code}
          </Heading>

          <Text style={{ fontSize: '14px', color: '#71717a' }}>
            Kode ini bersifat rahasia. Jangan bagikan kepada siapa pun.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}