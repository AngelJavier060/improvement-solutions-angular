package com.improvementsolutions.dto;

import com.improvementsolutions.model.User;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class UserResponseDto {
    private Long id;
    private String name;
    private String email;
    private String username;
    private String phone;
    private Boolean active;
    private List<String> roles;

    public UserResponseDto(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.username = user.getUsername();
        this.phone = user.getPhone();
        this.active = user.getActive();
        this.roles = user.getRoles().stream()
                .map(role -> role.getName())
                .collect(Collectors.toList());
    }

    public static List<UserResponseDto> fromUsers(java.util.Collection<User> users) {
        return users.stream()
                .map(UserResponseDto::new)
                .collect(Collectors.toList());
    }
}
