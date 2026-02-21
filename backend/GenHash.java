import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
        System.out.println("12345 => " + enc.encode("12345"));
        System.out.println("Alexandra123@1 => " + enc.encode("Alexandra123@1"));
    }
}
